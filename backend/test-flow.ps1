$ErrorActionPreference = "Stop"

$email = "testps_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$password = "password123"
$baseUrl = "http://localhost:5000/api/auth"

Write-Host "Testing with email: $email"

# 1. Register
try {
    $body = @{
        email = $email
        password = $password
        name = "Test PS User"
        role = "student"
        college = "PS College"
        roll_number = "PS123"
        location = "PS Loc"
    } | ConvertTo-Json

    $msg = Invoke-RestMethod -Uri "$baseUrl/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Registration Success: $($msg.message)"
} catch {
    Write-Error "❌ Registration Failed: $_"
    exit 1
}

# 2. Try Login (Should Fail - User not in real User table yet)
try {
    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $body -ContentType "application/json"
    Write-Error "❌ Login succeeded but should have failed (User should not exist yet)!"
} catch {
    if ($_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::NotFound) {
        Write-Host "✅ Login blocked as expected (404 Not Found - User not in active table)"
    } else {
         Write-Error "❌ Login failed with unexpected status: $($_.Exception.Response.StatusCode)"
    }
}

# 3. Get OTP from PendingUser Table
Write-Host "Fetching OTP from PendingUsers table..."
$otpRaw = node -e "
const { PendingUser, sequelize } = require('./models');
(async () => {
  try {
    const user = await PendingUser.findOne({ where: { email: '$email' } });
    if (user) console.log('OTP_VALUE:' + user.verification_token);
    else console.log('OTP_VALUE:NOT_FOUND');
  } catch (e) { console.error(e); }
  process.exit(0);
})();
" 2>&1

$otp = $otpRaw | Select-String "OTP_VALUE:(\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }

if (-not $otp) {
    Write-Error "❌ Could not fetch OTP from PendingUser. Raw output: $otpRaw"
    exit 1
}
Write-Host "Got OTP: $otp"

# 4. Verify Email
try {
    $body = @{
        email = $email
        otp = $otp.Trim()
    } | ConvertTo-Json

    $msg = Invoke-RestMethod -Uri "$baseUrl/verify-email" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Email Verification Success: $($msg.message)"
} catch {
    Write-Error "❌ Verification Failed: $_"
    exit 1
}

# 5. Login Again (Should Success - User moved to real table)
try {
    $body = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Login Success after verification. Token: $($res.token.Substring(0, 10))..."
} catch {
    Write-Error "❌ Login failed after verification: $_"
    exit 1
}
