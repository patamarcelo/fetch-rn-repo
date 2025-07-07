package com.patamarcelo.fetchapp

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use a util class [DefaultReactActivityDelegate]
   * which allows you to easily enable Fabric and Concurrent React (aka React 18) with two boolean flags.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(
        this,
        mainComponentName,
        // CORREÇÃO 1: Definido como 'false' para corrigir o erro de build,
        // já que seu projeto não usa a Nova Arquitetura (Fabric).
        false 
    )
  }

  /**
   * CORREÇÃO 2: Adicionado para compatibilidade com a biblioteca react-native-screens.
   * Resolveu o crash original de 'NullPointerException'.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}