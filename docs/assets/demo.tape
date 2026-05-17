# vhs script for docs/assets/demo.gif
#
# To re-record:
#   1. Install vhs:    https://github.com/charmbracelet/vhs (Go binary)
#   2. Install ttyd:   apt-get install ttyd     (Linux/WSL)
#                      brew install ttyd        (macOS)
#   3. Install ffmpeg: apt-get install ffmpeg   (Linux/WSL)
#                      brew install ffmpeg      (macOS)
#   4. From the repo root:
#        vhs docs/assets/demo.tape
#   5. The script writes docs/assets/demo.gif. Size budget: 2 MB. If you
#      exceed it, the docs.yml CI job will fail. Optimize with:
#        gifsicle -O3 --colors 128 -o docs/assets/demo.gif docs/assets/demo.gif

Output docs/assets/demo.gif

Set FontSize 16
Set Width 1200
Set Height 700
Set Theme "Catppuccin Mocha"
Set Padding 24
Set TypingSpeed 30ms

# Scene 1: User asks the agent
Type "# In Cursor, you tell the chat:"
Sleep 800ms
Enter

Type "#   'Install Tracklution server-side tracking on this project.'"
Sleep 1500ms
Enter
Sleep 400ms
Enter

# Scene 2: Agent reflex — runs npx
Type "# The agent runs:"
Sleep 400ms
Enter
Type "npx tracklution --json"
Sleep 800ms
Enter
Sleep 2500ms

Enter
Type "# It reads the JSON and writes .cursor/mcp.json:"
Sleep 800ms
Enter
Type "cat .cursor/mcp.json"
Sleep 400ms
Enter
Sleep 2000ms
Enter

# Scene 3: User enables the MCP
Type "# You enable 'tracklution' in Cursor's MCP settings."
Sleep 1200ms
Enter
Type "# Then say 'go'."
Sleep 1500ms
Enter
Enter

# Scene 4: MCP onboarding loop
Type "# The agent calls:"
Sleep 400ms
Enter
Type "#   scout_website -> register_and_provision -> get_installation_scripts"
Sleep 1500ms
Enter
Type "#   (agent applies snippets) -> verify_and_score -> create_login_link"
Sleep 1500ms
Enter
Enter

# Scene 5: Done
Type "# Result: tracking is live."
Sleep 1500ms
Enter
Type "echo 'Done. Server-side tracking is sending events to your ad platforms.'"
Sleep 400ms
Enter
Sleep 2000ms
