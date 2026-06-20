$out = & "C:\Program Files\nodejs\node.exe" "C:\Users\josh.mcdonald\git\nexus-verge-crpg\tools\image-gen\generate.js" @args 2>&1
$out | Set-Content "C:\Users\josh.mcdonald\git\nexus-verge-crpg\tools\image-gen\_run.log"
