package com.patamarcelo.fetchapp

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint 
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(
        this,
        mainComponentName,
        false 
    )
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}