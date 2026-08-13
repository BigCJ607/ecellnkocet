import re

with open(r'd:\tiredboss\src\pages\TeamsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "backgroundColor: hovered ?" in line and "88,104" in line:
        lines[i] = "        backgroundColor: hovered ? 'var(--color-bg)' : 'var(--color-white)',\n"
    elif "boxShadow: hovered ?" in line and "88,104" in line:
        lines[i] = "        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.05)' : 'none',\n"
    elif "background: ''var(--color-cream)''" in line:
        lines[i] = line.replace("''var(--color-cream)''", "'var(--color-cream)'")
    
with open(r'd:\tiredboss\src\pages\TeamsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
