# Run on Your Phone with Expo Go

## Prerequisites
✅ Backend running on your computer
✅ Phone and computer on the **same WiFi network**
✅ Expo Go app installed on your phone

---

## Step 1: Find Your Computer's IP Address

### Windows:
```powershell
ipconfig
```
Look for **IPv4 Address** under your active network adapter (usually WiFi or Ethernet).
Example: `192.168.1.100`

### Mac/Linux:
```bash
ifconfig
```
Look for **inet** under your active network (usually en0 for WiFi).
Example: `192.168.1.100`

**Important:** Do NOT use `127.0.0.1` or `localhost` - these won't work on your phone!

---

## Step 2: Update API Configuration

1. Open `c:\dev\Styled\styled-app\.env`
2. Replace `localhost` with your computer's IP:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
   ```
   (Replace `192.168.1.100` with YOUR actual IP)

---

## Step 3: Update Backend CORS

The backend needs to allow requests from your phone's IP.

Open `c:\dev\Styled\backend\src\index.ts` and verify CORS is set to:
```typescript
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
}));
```
✅ This is already configured!

---

## Step 4: Start the App

### Terminal 1 - Backend (if not already running):
```powershell
cd c:\dev\Styled\backend
npm run dev
```
Should show: `🚀 Server running on http://localhost:3000`

### Terminal 2 - Frontend:
```powershell
cd c:\dev\Styled\styled-app
npm start
```

You'll see a QR code in the terminal!

---

## Step 5: Open on Your Phone

### Option A: Scan QR Code (Easiest)
1. Open **Expo Go** app on your phone
2. Tap **"Scan QR code"**
3. Point camera at the QR code in your terminal
4. App will load on your phone!

### Option B: Manual Connection
1. Open **Expo Go** app
2. Tap **"Enter URL manually"**
3. Enter: `exp://192.168.1.100:8081` (use YOUR IP)
4. Tap **"Connect"**

---

## Troubleshooting

### ❌ "Unable to connect to server"
**Problem:** Phone can't reach your computer.

**Solutions:**
1. **Verify same WiFi:** Both devices must be on the same network
2. **Check IP address:** Make sure you used the correct IP in `.env`
3. **Restart Expo:** Stop (`Ctrl+C`) and restart `npm start`
4. **Check firewall:** Windows Firewall might be blocking port 8081
   - Go to Windows Firewall settings
   - Allow Node.js through firewall

### ❌ "Network request failed" or API errors
**Problem:** Phone can reach Expo but not the backend API.

**Solutions:**
1. **Check backend is running:** Visit `http://YOUR_IP:3000/health` in phone browser
2. **Update .env file:** Make sure IP is correct in `styled-app\.env`
3. **Restart frontend:** Stop and run `npm start` again
4. **Check firewall:** Allow port 3000 through firewall

### ❌ QR code not showing
**Problem:** Terminal not displaying QR code.

**Solutions:**
1. Press `r` in terminal to reload
2. Or use manual connection method

### ❌ "Something went wrong" in Expo Go
**Problem:** App crashed or failed to load.

**Solutions:**
1. Check terminal for error messages
2. Clear Expo cache: `npx expo start -c`
3. Shake phone → tap "Reload"

---

## Testing on Phone

Once loaded, you should see:
- ✅ Home, Work, Going Out tabs
- ✅ Look cards with images
- ✅ Heart icons that toggle
- ✅ Tap card to see details
- ✅ "Shop Now" buttons that open links

**Try these:**
1. Swipe between tabs
2. Pull down to refresh
3. Tap heart icon to favorite
4. Tap card to view details
5. Tap "Shop Now" to open retailer links

---

## Useful Commands

### Restart with cache clear:
```powershell
npx expo start -c
```

### Open on specific device:
- Press `a` - Open on Android emulator
- Press `i` - Open on iOS simulator
- Press `w` - Open in web browser

### View logs:
All console.log statements will appear in your terminal!

---

## Development Tips

### Hot Reload
- Changes to code auto-reload on your phone
- Shake phone to open developer menu
- Tap "Reload" to manually refresh

### Debug Menu (Shake Phone)
- **Reload** - Refresh the app
- **Debug Remote JS** - Use Chrome DevTools
- **Show Performance Monitor** - FPS and memory
- **Toggle Element Inspector** - Inspect UI elements

### View Console Logs
All `console.log()` statements appear in your computer's terminal, not on the phone!

---

## When You're Done

Press `Ctrl+C` in both terminals to stop:
1. Frontend (Expo)
2. Backend (Node.js)

---

## Next Steps

Once working on your phone:
- Test touch interactions
- Check scrolling performance
- Verify images load properly
- Test on different screen sizes
- Share with friends using the QR code!

---

## Quick Reference

**Your Computer's IP:** `192.168.1.100` (example - use yours!)

**Frontend .env:**
```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

**Backend URL:**
```
http://192.168.1.100:3000
```

**Expo URL:**
```
exp://192.168.1.100:8081
```

---

## Common Ports

- **3000** - Backend API
- **8081** - Expo Metro bundler (default)
- **8082** - Expo Metro bundler (alternate)
- **19000** - Expo DevTools

Make sure these ports aren't blocked by your firewall!
