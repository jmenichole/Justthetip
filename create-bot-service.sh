#!/bin/bash
#
# JustTheTip - Create Railway Service for Discord Bot
#
# Copyright (c) 2025 JustTheTip Bot
#
# This file is part of JustTheTip.
#
# Licensed under the JustTheTip Custom License (Based on MIT).
# See LICENSE file in the project root for full license information.
#
# SPDX-License-Identifier: MIT
#
# This software may not be sold commercially without permission.

echo "🤖 Creating Discord Bot Service in Railway..."

# Note: This requires manual service creation first via Railway dashboard
# Then link to that service with:

echo "1. Go to Railway dashboard: https://railway.app/project/169e8843-acd6-4da0-9c13-f806a77aedc7"
echo "2. Click '+ New' → 'GitHub Repo' → 'jmenichole/Justthetip'"
echo "3. Once service is created, come back here"
echo ""
read -p "Press Enter once you've created the new service in Railway dashboard..."

# Set the start command via settings
echo "4. In Railway: Settings → Custom Start Command → 'node bot.js'"
echo "5. Add environment variables from RAILWAY_READY_TO_PASTE.txt"
echo ""
echo "✅ Then click Deploy in Railway dashboard!"
