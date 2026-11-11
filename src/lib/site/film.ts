/** Play the landing film only when the tab is visible and the hero is on screen. */
export function shouldPlayFilm(input: { tabHidden: boolean; heroOnScreen: boolean }): boolean {
  return !input.tabHidden && input.heroOnScreen;
}
