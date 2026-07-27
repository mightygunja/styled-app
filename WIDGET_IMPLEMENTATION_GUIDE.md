# 📱 Home Screen Widgets Implementation Guide

## Current Status: ⚠️ PREVIEW MODE ONLY

The current widget implementation in Styled is **UI/UX only** - it shows what widget management would look like, but does not create actual home screen widgets.

---

## 🔍 What Currently Exists

### ✅ **Implemented (Mock/Preview):**
- `src/services/widgetService.ts` - Widget data service (mock)
- `src/screens/WidgetScreen.tsx` - Widget management UI
- Widget types: Outfit, Stats, Calendar, Quick Actions
- Widget sizes: Small, Medium, Large
- Widget settings and preferences
- Analytics tracking (mock)

### ❌ **Not Implemented (Required for Real Widgets):**
- Native iOS Widget Extension (Swift/SwiftUI)
- Native Android App Widget (Kotlin/Java)
- Data sharing between app and widgets
- Widget update mechanisms
- Home screen widget installation

---

## 🎯 Implementation Options

### **Option 1: Native Implementation (Full Control)** ⭐ RECOMMENDED

**Pros:**
- Full control over widget appearance
- Best performance
- Native platform features
- No third-party dependencies

**Cons:**
- Requires native development (Swift/Kotlin)
- More complex setup
- Needs Expo prebuild or bare workflow

**Estimated Time:** 2-3 weeks per platform

---

### **Option 2: React Native Widget Libraries (Easier)**

**Pros:**
- Write widgets in React Native
- Shared code between app and widgets
- Faster development

**Cons:**
- Limited library support
- May have performance issues
- Still requires some native code

**Estimated Time:** 1-2 weeks per platform

---

### **Option 3: Web-Based Widgets (iOS 17+)**

**Pros:**
- Use web technologies
- Easier to maintain
- Cross-platform code

**Cons:**
- iOS 17+ only
- Limited functionality
- Not available on Android

**Estimated Time:** 1 week (iOS only)

---

## 🛠️ Implementation Roadmap

### **Phase 1: iOS Widgets (Weeks 1-3)**

#### **Week 1: Setup & Infrastructure**

1. **Eject from Expo Managed Workflow:**
```bash
cd styled-app
npx expo prebuild
```

2. **Open iOS Project in Xcode:**
```bash
open ios/StyledApp.xcworkspace
```

3. **Create Widget Extension:**
- File → New → Target
- Select "Widget Extension"
- Name: "StyledWidgets"
- Language: Swift
- Include Configuration Intent: Yes

4. **Configure App Groups (for data sharing):**
- In Xcode, select main app target
- Signing & Capabilities → + Capability → App Groups
- Add group: `group.com.styled.app`
- Repeat for widget target

#### **Week 2: Widget Development**

5. **Create Outfit Widget:**

**File:** `ios/StyledWidgets/OutfitWidget.swift`
```swift
import WidgetKit
import SwiftUI

struct OutfitEntry: TimelineEntry {
    let date: Date
    let outfit: OutfitData?
}

struct OutfitData: Codable {
    let name: String
    let imageUrl: String
    let items: Int
    let weather: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> OutfitEntry {
        OutfitEntry(date: Date(), outfit: nil)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (OutfitEntry) -> ()) {
        let entry = OutfitEntry(date: Date(), outfit: loadOutfitData())
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<OutfitEntry>) -> ()) {
        let currentDate = Date()
        let entry = OutfitEntry(date: currentDate, outfit: loadOutfitData())
        
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    private func loadOutfitData() -> OutfitData? {
        // Read from shared UserDefaults
        let sharedDefaults = UserDefaults(suiteName: "group.com.styled.app")
        guard let data = sharedDefaults?.data(forKey: "todayOutfit") else {
            return nil
        }
        
        return try? JSONDecoder().decode(OutfitData.self, from: data)
    }
}

struct OutfitWidgetView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "8b5cf6"), Color(hex: "a78bfa")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            if let outfit = entry.outfit {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Today's Outfit")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                    
                    Text(outfit.name)
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    HStack {
                        Label("\(outfit.items) items", systemImage: "tshirt")
                        Spacer()
                        Label(outfit.weather, systemImage: "cloud.sun")
                    }
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.9))
                }
                .padding()
            } else {
                VStack {
                    Image(systemName: "tshirt")
                        .font(.largeTitle)
                        .foregroundColor(.white)
                    Text("No outfit set")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
    }
}

@main
struct OutfitWidget: Widget {
    let kind: String = "OutfitWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            OutfitWidgetView(entry: entry)
        }
        .configurationDisplayName("Today's Outfit")
        .description("See your outfit for today")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

6. **Create Data Sharing Service in React Native:**

**File:** `src/services/widgetDataService.ts`
```typescript
import { Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const APP_GROUP = 'group.com.styled.app';

export const widgetDataService = {
  async updateTodayOutfit(outfit: {
    name: string;
    imageUrl: string;
    items: number;
    weather: string;
  }) {
    if (Platform.OS !== 'ios') return;
    
    try {
      await SharedGroupPreferences.setItem(
        'todayOutfit',
        JSON.stringify(outfit),
        APP_GROUP
      );
      
      // Reload all widgets
      // Note: This requires a native module
      // NativeModules.WidgetCenter?.reloadAllTimelines();
    } catch (error) {
      console.error('Failed to update widget data:', error);
    }
  },

  async updateStats(stats: {
    totalOutfits: number;
    itemsWorn: number;
    favoriteStyle: string;
  }) {
    if (Platform.OS !== 'ios') return;
    
    try {
      await SharedGroupPreferences.setItem(
        'stats',
        JSON.stringify(stats),
        APP_GROUP
      );
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }
};
```

7. **Install Required Package:**
```bash
npm install react-native-shared-group-preferences
cd ios && pod install && cd ..
```

#### **Week 3: Testing & Polish**

8. **Test Widgets:**
- Run app on device/simulator
- Add widget to home screen
- Verify data updates
- Test different sizes
- Test tap actions

9. **Add Deep Linking:**

**Update:** `ios/StyledWidgets/OutfitWidget.swift`
```swift
struct OutfitWidgetView: View {
    var entry: Provider.Entry
    
    var body: some View {
        // ... existing code ...
        .widgetURL(URL(string: "styled://outfit/today"))
    }
}
```

**Handle in App:** `src/navigation/linking.ts`
```typescript
const linking = {
  prefixes: ['styled://'],
  config: {
    screens: {
      OutfitDetail: 'outfit/:id',
      // ... other screens
    },
  },
};
```

---

### **Phase 2: Android Widgets (Weeks 4-6)**

#### **Week 4: Setup & Infrastructure**

1. **Create Widget Provider:**

**File:** `android/app/src/main/java/com/styled/widgets/OutfitWidgetProvider.kt`
```kotlin
package com.styled.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.styled.R
import org.json.JSONObject

class OutfitWidgetProvider : AppWidgetProvider() {
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.outfit_widget)
        
        // Load outfit data from SharedPreferences
        val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
        val outfitJson = prefs.getString("today_outfit", null)
        
        if (outfitJson != null) {
            val outfit = JSONObject(outfitJson)
            views.setTextViewText(R.id.outfit_name, outfit.getString("name"))
            views.setTextViewText(R.id.outfit_items, "${outfit.getInt("items")} items")
            views.setTextViewText(R.id.outfit_weather, outfit.getString("weather"))
            
            // Load image (requires Glide or similar)
            // views.setImageViewUri(R.id.outfit_image, Uri.parse(outfit.getString("imageUrl")))
        } else {
            views.setTextViewText(R.id.outfit_name, "No outfit set")
        }
        
        // Set up tap action
        val intent = Intent(context, MainActivity::class.java).apply {
            action = "VIEW_OUTFIT"
        }
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    companion object {
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, OutfitWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            context.sendBroadcast(intent)
        }
    }
}
```

2. **Create Widget Layout:**

**File:** `android/app/src/main/res/layout/outfit_widget.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@drawable/widget_background">

    <TextView
        android:id="@+id/widget_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Today's Outfit"
        android:textSize="12sp"
        android:textColor="#FFFFFF"
        android:alpha="0.8" />

    <TextView
        android:id="@+id/outfit_name"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Business Casual"
        android:textSize="16sp"
        android:textStyle="bold"
        android:textColor="#FFFFFF"
        android:layout_marginTop="4dp" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="8dp">

        <TextView
            android:id="@+id/outfit_items"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="3 items"
            android:textSize="12sp"
            android:textColor="#FFFFFF"
            android:alpha="0.9" />

        <TextView
            android:id="@+id/outfit_weather"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="72°F"
            android:textSize="12sp"
            android:textColor="#FFFFFF"
            android:alpha="0.9" />
    </LinearLayout>
</LinearLayout>
```

3. **Create Widget Background:**

**File:** `android/app/src/main/res/drawable/widget_background.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <gradient
        android:startColor="#8b5cf6"
        android:endColor="#a78bfa"
        android:angle="135" />
    <corners android:radius="16dp" />
</shape>
```

4. **Register Widget:**

**File:** `android/app/src/main/AndroidManifest.xml`
```xml
<receiver
    android:name=".widgets.OutfitWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/outfit_widget_info" />
</receiver>
```

5. **Create Widget Info:**

**File:** `android/app/src/main/res/xml/outfit_widget_info.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/outfit_widget"
    android:description="@string/outfit_widget_description"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

#### **Week 5-6: Implementation & Testing**

6. **Create Native Module for Widget Updates:**

**File:** `android/app/src/main/java/com/styled/WidgetModule.kt`
```kotlin
package com.styled

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.styled.widgets.OutfitWidgetProvider
import org.json.JSONObject

class WidgetModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    override fun getName() = "WidgetModule"
    
    @ReactMethod
    fun updateOutfitWidget(data: ReadableMap) {
        val context = reactApplicationContext
        val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
        
        val outfit = JSONObject().apply {
            put("name", data.getString("name"))
            put("items", data.getInt("items"))
            put("weather", data.getString("weather"))
            put("imageUrl", data.getString("imageUrl"))
        }
        
        prefs.edit()
            .putString("today_outfit", outfit.toString())
            .apply()
        
        // Trigger widget update
        OutfitWidgetProvider.updateAllWidgets(context)
    }
}
```

7. **Register Native Module:**

**File:** `android/app/src/main/java/com/styled/WidgetPackage.kt`
```kotlin
package com.styled

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WidgetPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(WidgetModule(reactContext))
    }
    
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

8. **Update React Native Code:**

**File:** `src/services/widgetDataService.ts`
```typescript
import { NativeModules, Platform } from 'react-native';

const { WidgetModule } = NativeModules;

export const widgetDataService = {
  async updateTodayOutfit(outfit: {
    name: string;
    imageUrl: string;
    items: number;
    weather: string;
  }) {
    try {
      if (Platform.OS === 'ios') {
        // iOS implementation (from Phase 1)
        await SharedGroupPreferences.setItem(
          'todayOutfit',
          JSON.stringify(outfit),
          APP_GROUP
        );
      } else if (Platform.OS === 'android') {
        // Android implementation
        await WidgetModule.updateOutfitWidget(outfit);
      }
    } catch (error) {
      console.error('Failed to update widget:', error);
    }
  }
};
```

---

## 🎨 Widget Types to Implement

### **1. Outfit Widget** (Priority: HIGH)
- **Small:** Outfit name + icon
- **Medium:** Outfit image + name + items
- **Large:** Full outfit with items list

### **2. Stats Widget** (Priority: MEDIUM)
- **Small:** Total outfits count
- **Medium:** Outfits + items worn
- **Large:** Full stats dashboard

### **3. Calendar Widget** (Priority: MEDIUM)
- **Small:** Today's outfit
- **Medium:** Week view
- **Large:** Month view with outfits

### **4. Quick Actions Widget** (Priority: LOW)
- **Small:** Single action button
- **Medium:** 4 action buttons
- **Large:** 8 action buttons

---

## 📝 Integration Checklist

### **Before Starting:**
- [ ] Decide on implementation approach (Native vs Library)
- [ ] Set up development environment (Xcode + Android Studio)
- [ ] Eject from Expo managed workflow
- [ ] Create test devices/simulators

### **iOS Implementation:**
- [ ] Create Widget Extension target
- [ ] Configure App Groups
- [ ] Implement widget views (Swift/SwiftUI)
- [ ] Set up data sharing
- [ ] Add deep linking
- [ ] Test on device
- [ ] Submit for App Store review

### **Android Implementation:**
- [ ] Create Widget Provider class
- [ ] Create widget layouts (XML)
- [ ] Register in AndroidManifest
- [ ] Implement native module
- [ ] Set up data sharing
- [ ] Add tap actions
- [ ] Test on device
- [ ] Submit for Play Store review

### **React Native Integration:**
- [ ] Update widgetDataService.ts
- [ ] Add widget update calls throughout app
- [ ] Update WidgetScreen.tsx UI
- [ ] Add widget setup instructions
- [ ] Test data flow
- [ ] Update documentation

---

## 🚀 Quick Start (For Testing)

If you want to test widgets quickly without full implementation:

### **Option: Use Scriptable (iOS Only)**

1. **Install Scriptable app** from App Store
2. **Create API endpoint** in your app:

```typescript
// src/api/widgetAPI.ts
export async function getWidgetData(userId: string, widgetType: string) {
  // Return widget data
  return {
    outfit: {
      name: "Business Casual",
      items: 3,
      weather: "72°F"
    }
  };
}
```

3. **Create Scriptable script:**
```javascript
// Styled Outfit Widget
const url = "https://your-api.com/widget/outfit?userId=123";
const req = new Request(url);
const data = await req.loadJSON();

const widget = new ListWidget();
widget.backgroundColor = new Color("#8b5cf6");

const title = widget.addText("Today's Outfit");
title.textColor = Color.white();
title.font = Font.caption1();

const name = widget.addText(data.outfit.name);
name.textColor = Color.white();
name.font = Font.headline();

Script.setWidget(widget);
Script.complete();
```

4. **Add widget to home screen** using Scriptable

---

## 📚 Resources

### **Documentation:**
- [iOS WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [Android App Widgets](https://developer.android.com/develop/ui/views/appwidgets)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)

### **Libraries:**
- [react-native-shared-group-preferences](https://github.com/KjellConnelly/react-native-shared-group-preferences)
- [react-native-android-widget](https://github.com/salRoid/react-native-android-widget)

### **Examples:**
- [WidgetKit Examples](https://github.com/pawello2222/WidgetExamples)
- [Android Widget Examples](https://github.com/android/views-widgets-samples)

---

## ⚠️ Important Notes

1. **Widgets are separate processes** - They don't have access to your React Native code directly
2. **Data must be shared** via App Groups (iOS) or SharedPreferences (Android)
3. **Widgets have memory limits** - Keep data small and efficient
4. **Update frequency is limited** - iOS: 15 min minimum, Android: 30 min recommended
5. **Testing requires physical devices** - Simulators have limitations
6. **App Store review required** - Widgets are part of app submission

---

## 🎯 Recommendation

For the Styled app, I recommend:

1. **Start with iOS** (larger ARPU, better widget support)
2. **Implement Outfit Widget first** (most valuable to users)
3. **Use native implementation** (best performance and control)
4. **Plan for 3-4 weeks** of development time
5. **Test thoroughly** before launch

The current WidgetScreen.tsx provides a good foundation for the UI - you just need to add the native widget implementation behind it.

---

*Last Updated: December 3, 2025*
*Status: Planning Phase - Native Implementation Required*
