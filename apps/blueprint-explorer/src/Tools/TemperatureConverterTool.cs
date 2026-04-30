using ModelContextProtocol.Server;
using System.ComponentModel;

namespace ZynxMcpServer.Tools;

[McpServerToolType]
public sealed class TemperatureConverterTool
{
    [McpServerTool, Description("Converts temperature from Celsius to Fahrenheit.")]
    public static double CelsiusToFahrenheit(double celsius)
    {
        return (celsius * 9 / 5) + 32;
    }

    [McpServerTool, Description("Converts temperature from Fahrenheit to Celsius.")]
    public static double FahrenheitToCelsius(double fahrenheit)
    {
        return (fahrenheit - 32) * 5 / 9;
    }
}