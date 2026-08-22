import styles from './route-state.module.css'

export default function Loading() {
  return (
    <main className={styles.routeState} aria-live="polite">
      <span className={styles.seal} aria-hidden="true">✦</span>
      <strong>Opening the Main Museum</strong>
      <small>Preparing the exhibition lights</small>
    </main>
  )
}
