param(
    [string]$ConfigPath = ".\deploy.local.json"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Missing deploy config: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$bucket = $config.s3Bucket
$distributionId = $config.cloudFrontDistributionId
$region = $config.awsRegion

if (-not $bucket -or -not $distributionId -or -not $region) {
    throw "deploy.local.json must contain s3Bucket, cloudFrontDistributionId, and awsRegion."
}

$apiUrl = aws cloudformation describe-stacks `
    --stack-name dameisha-serverless-api `
    --region $region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" `
    --output text

if (-not $apiUrl) {
    throw "Could not resolve ApiEndpoint from CloudFormation stack dameisha-serverless-api."
}

$siteDir = Join-Path ([System.IO.Path]::GetTempPath()) "dameisha-site"
if (Test-Path -LiteralPath $siteDir) {
    Remove-Item -LiteralPath $siteDir -Recurse -Force
}
New-Item -ItemType Directory -Path $siteDir | Out-Null

$dirs = @("assets", "config", "css", "data", "fonts", "js", "pages")
foreach ($dir in $dirs) {
    Copy-Item -LiteralPath (Join-Path $repoRoot $dir) -Destination $siteDir -Recurse
}

Get-ChildItem -LiteralPath $repoRoot -File -Filter "*.html" | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $siteDir
}

$indexPath = Join-Path $siteDir "index.html"
$html = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
$marker = '    <script src="./config/index.js"></script>'
$snippet = @"
    <script>
        window.__QX_API_BASE_URL__ = '$apiUrl';
        window.__COGNITO_HOSTED_UI_DOMAIN__ = 'https://us-east-1xduz7sblr.auth.us-east-1.amazoncognito.com';
        window.__COGNITO_CLIENT_ID__ = '2hocldoipetlrco1llmcc86nnk';
        window.__COGNITO_REDIRECT_URI__ = 'https://dxxkk6hppugiw.cloudfront.net/';
    </script>
"@

if ($html.Contains("__QX_API_BASE_URL__")) {
    $pattern = '(?s)    <script>\s+window\.__QX_API_BASE_URL__.*?    </script>\r?\n'
    $html = [regex]::Replace($html, $pattern, $snippet + [Environment]::NewLine, 1)
} else {
    $html = $html.Replace($marker, $snippet + [Environment]::NewLine + $marker)
}

Set-Content -LiteralPath $indexPath -Value $html -Encoding UTF8

aws s3 sync $siteDir "s3://$bucket" `
    --delete `
    --cache-control "public,max-age=300" `
    --region $region

aws cloudfront create-invalidation `
    --distribution-id $distributionId `
    --paths "/*" `
    --region $region

Write-Host "Frontend deployed to s3://$bucket and CloudFront invalidation requested for $distributionId."
