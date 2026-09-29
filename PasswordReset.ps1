$password = Read-Host "Enter a new admin password (minimum 10 characters)"
if ($password.Length -lt 10) {
    throw "Password must be at least 10 characters."
}

$salt = New-Object byte[] 16
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($salt)
$rng.Dispose()

$passwordBytes = [Text.Encoding]::UTF8.GetBytes($password)
$payload = New-Object byte[] ($passwordBytes.Length + $salt.Length)
[Array]::Copy($passwordBytes, 0, $payload, 0, $passwordBytes.Length)
[Array]::Copy($salt, 0, $payload, $passwordBytes.Length, $salt.Length)

$sha = [Security.Cryptography.SHA256]::Create()
$hash = $sha.ComputeHash($payload)

for ($i = 1; $i -lt 120000; $i++) {
    $hash = $sha.ComputeHash($hash)
}
$sha.Dispose()

$salt64 = [Convert]::ToBase64String($salt).TrimEnd('=')
$hash64 = [Convert]::ToBase64String($hash).TrimEnd('=')
$encoded = "sha256:120000:$salt64`:$hash64"

$db = "postgres://postgres:postgres@localhost:5432/simpletech_books?sslmode=require"
$sql = "UPDATE users SET password_hash='$encoded', active=true, updated_at=now() WHERE lower(username)='admin';"

& "C:\Program Files\PostgreSQL\17\bin\psql.exe" $db -c $sql