$ErrorActionPreference = "Stop"
$email = "testps_20260209102255@example.com"
$baseUrl = "http://localhost:5000/api/auth"

Write-Host "Verifying email: $email"

# 1. Get OTP from PendingUser Table
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

# 2. Verify Email
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

# 3. Check User Table
Write-Host "Checking Users table for moved user..."
$checkRaw = node -e "
const { User, PendingUser, sequelize } = require('./models');
(async () => {
  try {
    const userMain = await User.findOne({ where: { email: '$email' } });
    const userPending = await PendingUser.findOne({ where: { email: '$email' } });
    
    if (userMain && !userPending) console.log('CHECK_STATUS:SUCCESS');
    else {
        console.log('CHECK_STATUS:FAILURE');
        console.log('Main:', !!userMain);
        console.log('Pending:', !!userPending);
    }
  } catch (e) { console.error(e); }
  process.exit(0);
})();
" 2>&1

if ($checkRaw -match "CHECK_STATUS:SUCCESS") {
    Write-Host "✅ SUCCESS: User moved to main table and removed from pending."
} else {
    Write-Error "❌ FAILURE: DB state incorrect. Output: $checkRaw"
    exit 1
}
