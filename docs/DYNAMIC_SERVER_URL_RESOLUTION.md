# Dynamic Server URL Resolution Implementation

## Overview

This document details the implementation of dynamic server URL resolution to eliminate hardcoded IP addresses and enable automatic network detection for the casino multiplayer game.

## Problem

The original implementation had hardcoded IP addresses in socket hooks:
- `hooks/useSocket.ts`: `http://192.168.18.2:3001` (incorrect IP)
- `multiplayer/client/hooks/useSocket.ts`: `http://localhost:3001`

This caused connectivity issues when:
1. Network configurations changed
2. Running on different machines
3. Switching between localhost and LAN environments

## Solution

Implemented a comprehensive `ServerUrlResolver` class in `utils/serverUrl.ts` that provides automatic server URL detection based on network context.

## Architecture

### ServerUrlResolver Class

Located: `utils/serverUrl.ts`

**Features:**
- Automatic detection of optimal server URL
- Support for multiple network modes: local, LAN, production
- Connectivity testing with fallback mechanisms
- Manual override capabilities
- Comprehensive diagnostics

**Configuration:**
```javascript
interface ServerConfig {
  localUrl: string;        // Default: http://localhost:3001
  lanUrl: string;         // Default: http://192.168.18.14:3001
  productionUrl?: string; // Optional production URL
  enableAutoDetect: boolean; // Auto-detection flag
  fallbackUrl: string;    // Default: http://localhost:3001
}
```

### Environment Configuration

**File:** `.env`
```env
SOCKET_URL_LOCAL=http://localhost:3001
SOCKET_URL_LAN=http://192.168.18.14:3001
AUTODETECT_ENABLED=true
```

**Requirements:**
- `AUTODETECT_ENABLED=true` enables automatic URL selection
- LAN URL should be set to the server's actual IP address

## Detection Algorithm

The resolver follows this priority order:

1. **Manual Override**: Check for explicit environment variables
2. **Auto-detection**: If enabled, test all candidate URLs in parallel
3. **Fallback**: Use configured fallback URL if no accessible servers found

### URL Candidates (by priority):
1. **Local** (Priority 1): `SOCKET_URL_LOCAL` - for development
2. **LAN** (Priority 2): `SOCKET_URL_LAN` - for network play
3. **Production** (Priority 3): `SOCKET_URL_PRODUCTION` - for deployed environments

### Connectivity Testing

Each candidate URL is tested using:
- Socket.IO handshake endpoint: `/socket.io/?EIO=4&transport=polling&t=test`
- 3-second timeout
- Response time measurement
- HTTP status code validation

## Hook Integration

### Main Hook: `hooks/useSocket.ts`

**Changes:**
- Import `getOptimalServerUrl()` from `../utils/serverUrl`
- Use async function inside `useEffect` for URL resolution
- Update logging to show resolved URL instead of hardcoded IP

**Pattern:**
```typescript
useEffect(() => {
  const connectToServer = async () => {
    const serverUrl = await getOptimalServerUrl();
    console.log(`[CLIENT] Connecting to server at ${serverUrl}`);

    const newSocket = io(serverUrl);
    // ... rest of socket setup
  };

  connectToServer();
}, []);
```

### Client Hook: `multiplayer/client/hooks/useSocket.ts`

**Changes:**
- Same pattern as main hook
- Path: `../../utils/serverUrl` (different relative path)

## Server Configuration

**File:** `multiplayer/server/index.js`

**Requirements:**
- Bind to `0.0.0.0` (all interfaces) for LAN accessibility
- Default port: 3001
- Cross-Origin Resource Sharing (CORS) enabled

**Example binding:**
```javascript
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on all interfaces at port ${PORT}`);
});
```

## Testing & Diagnostics

### Connectivity Testing

Run diagnostics to verify URL detection:
```javascript
import { getServerUrlDiagnostics } from './utils/serverUrl';

const diagnostics = await getServerUrlDiagnostics();
console.log(diagnostics);
// Shows config, connectivity results, and recommendation
```

### Testing Scenarios

1. **Local Development:**
   - Auto-detect should select `localhost:3001`
   - Manual override: `SOCKET_URL=localhost:3001`

2. **LAN Environment:**
   - Auto-detect should select configured LAN IP
   - Network connectivity to server IP required

3. **Production:**
   - Should use production URL if configured
   - Fallback to local if production unavailable

## Troubleshooting

### Common Issues

1. **Server not accessible:**
   - Check if server is running on port 3001
   - Verify LAN IP address is correct
   - Test firewall settings

2. **Wrong URL selected:**
   - Check `AUTODETECT_ENABLED` setting
   - Review environment variables
   - Run diagnostics to see connectivity results

3. **Connection timeouts:**
   - Increase timeout in `testUrlConnectivity()`
   - Check network connectivity
   - Verify Socket.IO version compatibility

### Debugging

Enable verbose logging:
```javascript
// In serverUrl.ts - already includes comprehensive logging
console.log(`[ServerURL] URL: ${url}, Accessible: ${result.accessible}`);
```

Run diagnostics in browser console:
```javascript
window.getServerUrlDiagnostics().then(console.log);
```

## Deployment Notes

### Environment Setup

**Development:**
- `AUTODETECT_ENABLED=true`
- LAN URL set to actual machine IP

**Production:**
- `AUTODETECT_ENABLED=false` (manual override)
- `SOCKET_URL_PRODUCTION=https://your-game-server.com`

### Security Considerations

- LAN URLs should only be accessible within trusted networks
- Consider encryption for production environments
- Rate limiting for connectivity tests

## Future Enhancements

1. **IPv6 Support:** Add IPv6 address detection
2. **Load Balancing:** Support multiple server URLs with load distribution
3. **Health Checks:** Periodic server health monitoring
4. **Caching:** Cache successful URLs to reduce detection overhead
5. **Retry Logic:** Implement exponential backoff for failed connections

## Files Modified

- ✅ `utils/serverUrl.ts` - ServerUrlResolver implementation
- ✅ `.env` - Configuration updates
- ⏳ `hooks/useSocket.ts` - Socket hook integration
- ⏳ `multiplayer/client/hooks/useSocket.ts` - Client hook integration
- ⏳ `multiplayer/server/index.js` - Server binding verification

---

**Implementation Date:** November 2025
**Status:** In Progress - Hook refactoring pending
