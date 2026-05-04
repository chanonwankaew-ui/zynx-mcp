#!/bin/bash

# Zynx Agent Platform - Cloud Run Deployment Script
# This script builds the Docker image and deploys it to Google Cloud Run.

# --- Configuration ---
GCLOUD_BIN="/Users/kant/google-cloud-sdk/bin/gcloud"
export CLOUDSDK_PYTHON="/opt/homebrew/bin/python3.12"
PROJECT_ID=$($GCLOUD_BIN config get-value project)
SERVICE_NAME="zynx-agent-platform"
REGION="asia-southeast1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting Deployment for Zynx Agent Platform..."
echo "📍 Project: $PROJECT_ID"
echo "📍 Service: $SERVICE_NAME"
echo "📍 Region:  $REGION"

# 1. Build and Push Image using Google Cloud Build
echo "📦 Building and Pushing Docker Image..."
$GCLOUD_BIN builds submit --tag $IMAGE_NAME .

# 2. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
$GCLOUD_BIN run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,ZYNX_API_BASE_URL=http://localhost:8787"

echo "✅ Deployment Complete!"
echo "🔗 Access your platform at: $($GCLOUD_BIN run services describe $SERVICE_NAME --platform managed --region $REGION --format='value(status.url)')"
echo "🛡️  Next Step: Connect your domain in Cloudflare and point it to this URL."
