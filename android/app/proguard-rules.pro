# Enterprise release rules for the unified AMAYA NSpector suite.
# Capacitor ships its own consumer rules; these cover the app module and the
# WebView bridge that R8 cannot see from Java bytecode alone.

# The launcher activity is resolved by the manifest.
-keep public class com.amaya.nspector.suite.MainActivity { *; }

# Capacitor plugin discovery uses reflection over annotated classes/methods.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}

# Cordova plugins are instantiated by class name from the generated plugin list.
-keep public class * extends org.apache.cordova.* { public <methods>; public <fields>; }

# Any JavaScript interface exposed to the WebView must survive shrinking.
-keepclassmembers,allowoptimization class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep runtime-visible annotations (Capacitor reads them at startup).
-keepattributes *Annotation*, InnerClasses, Signature, EnclosingMethod

# Keep native method names used by bundled libraries.
-keepclasseswithmembernames class * {
    native <methods>;
}

# Do not keep every public constructor: that hides real R8 regressions and
# defeats the point of shrinking if it is re-enabled later.

# Crash symbolication mapping is generated at
# build/outputs/mapping/release/mapping.txt and copied into dist/Android.
