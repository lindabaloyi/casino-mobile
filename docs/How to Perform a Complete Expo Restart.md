## 📋 __How to Perform a Complete Expo Restart (Step-by-Step Guide)__

This is the __critical step__ mentioned in the PRD analysis to ensure Expo Web reads your new environment variables properly.

### __🔴 Step 1: Stop Expo Completely__

- __Terminal/Command Prompt__: Type `npx expo stop`
- __Wait__ until you see confirmation that Expo has stopped
- __Never skip this__: Just `Ctrl+C` in the existing terminal isn't enough - you need the explicit stop command

### __🧹 Step 2: Clear Cache (Super Important!)__

- __Same terminal__: Type `npx expo start -c`
- __The `-c` flag__ is crucial - it clears the entire cache including environment variable cache
- __Alternative__: `npx expo start --clear` (same effect)

### __⏱️ Step 3: Wait for Full Restart__

- __Metro bundler__ will take longer initially while rebuilding with cleared cache
- __Watch for__: "Metro bundler ready" or "Local server ready" message
- __Be patient__: This takes 30-60 seconds longer than normal starts

### __🌐 Step 4: Open in Browser (Expo Web)__

- __Expo CLI will show__: `Web | http://localhost:8081`
- __Click that link__ or copy `http://localhost:8081` into your browser
- __Open browser dev tools__ (F12) → Console tab

### __🔍 Step 5: Check Console Logs (What We Added)__

Look for __these exact lines__ we added to verify environment variables:

```javascript
[ENV] SOCKET_URL read from .env: http://192.168.18.14:3001
[ENV] Final SOCKET_URL used: http://192.168.18.14:3001
[SOCKET] Creating connection to: http://192.168.18.14:3001
```

### __✅ Expected Results:__

__✅ GOOD (Environment variables working):__

```javascript
[ENV] SOCKET_URL read from .env: http://192.168.18.14:3001
[ENV] Final SOCKET_URL used: http://192.168.18.14:3001
[SOCKET] Creating connection to: http://192.168.18.14:3001
Connected to server, socket.id: abc123...
```

__❌ BAD (Environment variables not loading):__

```javascript
[ENV] SOCKET_URL read from .env: undefined
[ENV] Final SOCKET_URL used: http://localhost:3001
[SOCKET] Creating connection to: http://localhost:3001
Connection error: xhr poll error
```

### __🚨 If Still Failing (Fallback Plan):__

__❌ If you see the BAD output above:__

- The environment variable isn't loading
- Try changing the variable name to: `EXPO_PUBLIC_SERVER_URL=http://192.168.18.14:3001`
- Restart Expo again with `npx expo start -c`

### __📱 Testing Phone Connection:__

1. __Use Expo Go app__ on your phone
2. __Scan QR code__ from Expo CLI
3. __Should work immediately__ (phones use LAN IP correctly)

### __🧪 Verification Commands:__

__To verify current .env loading:__

```bash
# In project root
npx expo start -c
# Then check browser console logs
```

__To check IP address:__

```bash
# Windows cmd
ipconfig | find "IPv4"

# Look for 192.168.x.x address
ipconfig | find "192.168"
```

### __🎯 Summary:__

The full `npx expo stop` + `npx expo start -c` cycle is __essential__ because Expo caches environment variables aggressively. If you just use `Ctrl+C` and `npx expo start`, the browser might still use cached values from before you changed the .env file.

__This is why the PRD emphasized "Expo Web ignores environment variables without restart"__ - it was exactly right!
