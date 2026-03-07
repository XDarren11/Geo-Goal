import styles from "./Logo.module.css";

export default function Logo() {
  return (
    <img src="/logo.png" alt="Logotipo Geo-Goal" className={styles.root} />
  );
}
