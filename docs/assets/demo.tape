# CC Commander Demo — ~45 sec GIF
Output docs/assets/demo.gif

Set FontSize 15
Set Width 900
Set Height 500
Set Theme "Catppuccin Mocha"
Set TypingSpeed 60ms
Set Padding 20

# Scene 1: Show the install command
Type "# Install CC Commander"
Sleep 800ms
Enter
Sleep 300ms
Type "curl -fsSL https://raw.githubusercontent.com/KevinZai/commander/main/install-remote.sh | bash"
Sleep 1500ms

# Scene 2: Self-test — 27 modules, all passing
Enter
Sleep 400ms
Type "node bin/kc.js --test"
Sleep 600ms
Enter
Sleep 3000ms

# Scene 3: Stats
Type "node bin/kc.js --stats"
Sleep 500ms
Enter
Sleep 2000ms

# Scene 4: Browse skills (head of the 502-line list)
Type "node bin/kc.js --list-skills | head -8"
Sleep 500ms
Enter
Sleep 2000ms

# Hold final frame
Sleep 2000ms
