#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

DEFAULT_INPUT = Path("/Users/kant/Documents/Zynx/02_Agents/Blueprints/zynx_job_agent_mapping.xlsx")


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def read_shared_strings(archive: ZipFile) -> list[str]:
    path = "xl/sharedStrings.xml"
    if path not in archive.namelist():
        return []

    root = ET.fromstring(archive.read(path))
    strings = []
    for item in root.findall("main:si", NS):
        text = "".join(node.text or "" for node in item.findall(".//main:t", NS))
        strings.append(text)
    return strings


def workbook_sheet_map(archive: ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    relation_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in relationships.findall("pkgrel:Relationship", NS)
    }

    sheet_map = {}
    for sheet in workbook.findall("main:sheets/main:sheet", NS):
        rel_id = sheet.attrib[f"{{{NS['rel']}}}id"]
        target = relation_map[rel_id].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        sheet_map[sheet.attrib["name"]] = target
    return sheet_map


def column_to_number(column: str) -> int:
    value = 0
    for char in column:
        value = value * 26 + ord(char) - 64
    return value


def read_sheet_rows(archive: ZipFile, shared_strings: list[str], sheet_path: str) -> list[list[str]]:
    root = ET.fromstring(archive.read(sheet_path))
    rows: list[list[str]] = []

    for row in root.findall("main:sheetData/main:row", NS):
        values: dict[int, str] = {}
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "")
            match = re.match(r"([A-Z]+)(\d+)", ref)
            if not match:
                continue

            column = column_to_number(match.group(1))
            cell_type = cell.attrib.get("t")
            value_node = cell.find("main:v", NS)
            inline_node = cell.find("main:is", NS)

            text = ""
            if cell_type == "s" and value_node is not None and value_node.text is not None:
                shared_index = int(value_node.text)
                if 0 <= shared_index < len(shared_strings):
                    text = shared_strings[shared_index]
            elif cell_type == "inlineStr" and inline_node is not None:
                text = "".join(node.text or "" for node in inline_node.findall(".//main:t", NS))
            elif value_node is not None and value_node.text is not None:
                text = value_node.text

            text = normalize_space(text)
            if text:
                values[column] = text

        if values:
            width = max(values)
            rows.append([values.get(index, "") for index in range(1, width + 1)])
        else:
            rows.append([])

    return rows


def split_agents(raw_value: str) -> list[str]:
    return [part.strip() for part in raw_value.split(",") if part.strip()]


def cluster_summaries(records: list[dict[str, object]]) -> list[dict[str, object]]:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for record in records:
        cluster = str(record["cluster"])
        status = str(record["orgStatus"])
        counts[cluster]["total"] += 1
        counts[cluster][status] += 1

    summaries = []
    for cluster, counter in counts.items():
        summaries.append(
            {
                "name": cluster,
                "total": counter["total"],
                "matchCount": counter["Match"],
                "partialCount": counter["Partial"],
                "gapCount": counter["Gap"],
            }
        )
    return sorted(summaries, key=lambda item: (-item["total"], item["name"]))


def parse_mapping_sheet(rows: list[list[str]]) -> tuple[str, list[str], list[dict[str, object]]]:
    title = rows[0][0] if rows and rows[0] else "Zynx Job-to-Agent Mapping"
    headers = rows[1] if len(rows) > 1 else []
    records: list[dict[str, object]] = []

    for row in rows[2:]:
        if not any(row):
            continue

        padded = row + [""] * (len(headers) - len(row))
        values = dict(zip(headers, padded))
        cluster = values.get("Cluster / Department", "")
        job_position = values.get("Job Position", "")
        org_status = values.get("Org Status", "")
        agent_text = values.get("Zynx Agents ที่ใช้", "")
        primary_llm = values.get("Primary LLM", "")
        notes = values.get("Use Case / หมายเหตุ", "")
        source = values.get("Source", "")

        if not cluster or not job_position or not org_status:
            continue

        record_id = f"{cluster}|{job_position}"
        records.append(
            {
                "id": record_id,
                "cluster": cluster,
                "jobPosition": job_position,
                "orgStatus": org_status,
                "agentText": agent_text,
                "agents": split_agents(agent_text),
                "primaryLLM": primary_llm,
                "notes": notes,
                "source": source,
            }
        )

    return title, headers, records


def parse_summary_sheet(rows: list[list[str]]) -> tuple[str, list[dict[str, object]], list[dict[str, object]]]:
    title = rows[0][0] if rows and rows[0] else "Coverage Summary"
    metrics: list[dict[str, object]] = []
    agent_sources: list[dict[str, object]] = []

    for row in rows[2:]:
        if not any(row):
            continue
        if len(row) >= 2 and row[0] and row[1].isdigit():
            metrics.append(
                {
                    "label": row[0],
                    "count": int(row[1]),
                    "percentageText": row[2] if len(row) > 2 and row[2] else None,
                }
            )
        if row[0] == "Agent Sources":
            break

    agent_source_section = False
    for row in rows:
        if row[:2] == ["Agent Sources", "Count"]:
            agent_source_section = True
            continue
        if not agent_source_section or not any(row):
            continue
        if len(row) >= 2 and row[0] and row[1].isdigit():
            agent_sources.append(
                {
                    "label": row[0],
                    "count": int(row[1]),
                }
            )

    return title, metrics, agent_sources


def export_json(input_path: Path, output_path: Path) -> None:
    with ZipFile(input_path) as archive:
        shared_strings = read_shared_strings(archive)
        sheets = workbook_sheet_map(archive)

        mapping_rows = read_sheet_rows(archive, shared_strings, sheets["Job-to-Agent Mapping"])
        summary_rows = read_sheet_rows(archive, shared_strings, sheets["Summary"])

    _, columns, records = parse_mapping_sheet(mapping_rows)
    _, metrics, agent_sources = parse_summary_sheet(summary_rows)

    payload = {
        "generatedAt": now_utc(),
        "sourceFile": str(input_path),
        "sheetName": "Job-to-Agent Mapping",
        "summarySheetName": "Summary",
        "columns": columns,
        "records": records,
        "summary": {
            "metrics": metrics,
            "agentSources": agent_sources,
            "clusters": cluster_summaries(records),
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export Zynx blueprint mapping workbook to JSON.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Source .xlsx path")
    parser.add_argument("--output", type=Path, required=True, help="Output JSON path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = args.input.expanduser().resolve()
    output_path = args.output.expanduser().resolve()

    if not input_path.exists():
        if output_path.exists():
            print(f"Workbook not found at {input_path}; keeping existing {output_path}")
            return 0
        raise SystemExit(f"Workbook not found: {input_path}")

    export_json(input_path, output_path)
    print(f"Exported mapping data to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
