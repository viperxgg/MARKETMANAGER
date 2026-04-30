param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dev", "build", "lint", "typecheck", "prisma-generate", "prisma-push", "prisma-studio")]
  [string]$Task
)

$ErrorActionPreference = "Stop"
$env:ComSpec = "C:\Windows\System32\cmd.exe"

switch ($Task) {
  "dev" {
    & "$PSScriptRoot\..\node_modules\.bin\next.cmd" dev
    break
  }
  "build" {
    & "$PSScriptRoot\..\node_modules\.bin\next.cmd" build
    break
  }
  "lint" {
    & "$PSScriptRoot\..\node_modules\.bin\eslint.cmd" .
    break
  }
  "typecheck" {
    & "$PSScriptRoot\..\node_modules\.bin\tsc.cmd" --noEmit
    break
  }
  "prisma-generate" {
    & "$PSScriptRoot\..\node_modules\.bin\prisma.cmd" generate
    break
  }
  "prisma-push" {
    & "$PSScriptRoot\..\node_modules\.bin\prisma.cmd" db push
    break
  }
  "prisma-studio" {
    & "$PSScriptRoot\..\node_modules\.bin\prisma.cmd" studio
    break
  }
}
