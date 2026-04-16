import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import styles from './Layout.module.css'

const SITES = {
  extension: { label: 'File Extension', url: 'https://fileextension.taxrefundloan.us' },
  filing:    { label: 'File Taxes',     url: 'https://taxfiling.taxrefundloan.us' },
  loan:      { label: 'Refund Loan',    url: 'https://loan.taxrefundloan.us' },
}

interface Props {
  site: string
  children: React.ReactNode
}

export default function Layout({ site, children }: Props) {
  const { t, i18n } = useTranslation()
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'es' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
  }

  return (
    <div className={styles.wrapper}>
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <a href="/">TaxRefundLoan — {SITES[site as keyof typeof SITES]?.label}</a>
        </div>
        <div className={styles.navLinks}>
          {/* Cross-product links — always visible */}
          {(Object.keys(SITES) as Array<keyof typeof SITES>).map(key =>
            key !== site ? (
              <a key={key} href={SITES[key].url} className={styles.siteLink}>
                {SITES[key].label}
              </a>
            ) : null
          )}

          {token ? (
            <>
              <Link to="/dashboard">{t('nav.home')}</Link>
              {site === 'extension' && <Link to="/extension">{t('nav.extension')}</Link>}
              {site === 'filing'    && <Link to="/filing">{t('nav.taxfiling')}</Link>}
              {site === 'loan'      && <Link to="/loan">{t('nav.loan')}</Link>}
              <button onClick={handleLogout} className={styles.btnLink}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login">{t('nav.login')}</Link>
              <Link to="/register" className={styles.btnPrimary}>{t('nav.register')}</Link>
            </>
          )}
          <button onClick={toggleLang} className={styles.langBtn}>
            {i18n.language === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        © {new Date().getFullYear()} TaxRefundLoan.us — All rights reserved
      </footer>
    </div>
  )
}
