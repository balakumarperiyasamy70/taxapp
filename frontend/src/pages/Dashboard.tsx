import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import styles from './Dashboard.module.css'

interface Props { site: string }

export default function Dashboard({ site }: Props) {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  return (
    <div>
      <h2 className={styles.welcome}>Welcome, {user?.email}</h2>
      <div className={styles.cards}>
        {site === 'extension' && (
          <Link to="/extension" className={styles.card}>
            <div className={styles.icon}>📋</div>
            <h3>{t('extension.title')}</h3>
            <p>{t('extension.subtitle')}</p>
          </Link>
        )}
        {site === 'filing' && (
          <Link to="/filing" className={styles.card}>
            <div className={styles.icon}>📄</div>
            <h3>{t('filing.title')}</h3>
            <p>File your federal tax return online</p>
          </Link>
        )}
        {site === 'loan' && (
          <Link to="/loan" className={styles.card}>
            <div className={styles.icon}>💰</div>
            <h3>{t('loan.title')}</h3>
            <p>{t('loan.subtitle')}</p>
          </Link>
        )}
        <Link to="/verify" className={styles.card}>
          <div className={styles.icon}>🔒</div>
          <h3>{t('identity.title')}</h3>
          <p>Verify your identity to proceed</p>
        </Link>
      </div>
    </div>
  )
}
