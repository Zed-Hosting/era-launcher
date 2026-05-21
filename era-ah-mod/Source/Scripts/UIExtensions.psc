Scriptname UIExtensions Hidden
{
  Header stub for UIExtensions (Nexus #17561). At runtime the player's
  installed UIExtensions.pex supplies the real native bindings; this file
  only exists so our scripts compile without the full UIExtensions source
  available in this repository.
}

Function InitMenu(String asMenu) global native
Function OpenMenu(String asMenu) global native
String  Function GetMenuResultString(String asMenu) global native
Int     Function GetMenuResultInt(String asMenu) global native
Function SetMenuPropertyString(String asMenu, String asProperty, String asValue) global native
Function SetMenuPropertyInt(String asMenu, String asProperty, Int aiValue) global native
Function SetMenuPropertyFloat(String asMenu, String asProperty, Float afValue) global native
