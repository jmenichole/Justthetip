#!/bin/bash
# Fix Discord interaction timeouts by adding deferReply()

cd /Users/fullsail/justthetip

# Backup original file
cp bot.js bot.js.backup

# Add deferReply after the try block starts
sed -i '' '188 a\
    // Defer reply for commands that might take time\
    if (['"'"'balance'"'"', '"'"'withdraw'"'"', '"'"'deposit'"'"', '"'"'registerwallet'"'"', '"'"'tip'"'"', '"'"'airdrop'"'"'].includes(commandName)) {\
      await interaction.deferReply({ ephemeral: commandName !== '"'"'airdrop'"'"' });\
    }\
' bot.js

echo "✅ Added deferReply() to bot.js"
echo "📝 Original file backed up to bot.js.backup"
echo ""
echo "Next steps:"
echo "1. Test locally: node bot.js"
echo "2. Commit: git add bot.js && git commit -m 'fix: add deferReply()'"
echo "3. Push: git push origin main"
