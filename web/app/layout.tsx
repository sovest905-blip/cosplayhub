import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Unbounded, JetBrains_Mono, Manrope } from "next/font/google";
import AuthNav from "./components/AuthNav";
import MobileMenu from "./components/MobileMenu";
import "./globals.css";

// Самохостинг шрифтов: скачиваются при сборке, без зависимости от CDN в рантайме.
// display:"optional" + adjustFontFallback — НЕТ подмены на лету и НЕТ сдвига вёрстки (шрифты не «скачут»).
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "800", "900"],
  variable: "--font-display",
  display: "optional",
  adjustFontFallback: true,
  preload: true,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "optional",
  adjustFontFallback: true,
  preload: true,
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "optional",
  adjustFontFallback: true,
  preload: true,
});

export const metadata: Metadata = {
  title: "КОСПЛЕЙ.ХАБ — экосистема косплея СНГ",
  description: "Косплееры, мастерские, магазины, фотографы, события — в одном месте. Казахстан и СНГ.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${jetbrainsMono.variable} ${manrope.variable}`}>
      <body>
        <nav className="top">
          <div className="nav-inner">
            <a href="/" className="logo">
              <div className="logo-mark" />
              КОСПЛЕЙ.ХАБ
            </a>

            <div className="menu">
              <div className="menu-item">
                <a href="/" className="menu-link">Главная</a>
              </div>
              <div className="menu-item has-drop">
                <button className="menu-link">Люди</button>
                <div className="drop">
                  <a href="/people">
                    <div className="drop-ic">◉</div>
                    <div><b>Косплееры</b><small>1 248 анкет</small></div>
                  </a>
                  <a href="/people?role=photo">
                    <div className="drop-ic">◐</div>
                    <div><b>Фотографы</b><small>340 профилей</small></div>
                  </a>
                  <a href="/looks">
                    <div className="drop-ic">✧</div>
                    <div><b>Образы</b><small>3 400 работ</small></div>
                  </a>
                  <a href="/teams">
                    <div className="drop-ic">♛</div>
                    <div><b>Команды</b><small>86 объявлений</small></div>
                  </a>
                </div>
              </div>
              <div className="menu-item has-drop">
                <button className="menu-link">Услуги</button>
                <div className="drop">
                  <a href="/workshops">
                    <div className="drop-ic">◆</div>
                    <div><b>Мастерские</b><small>180 студий</small></div>
                  </a>
                  <a href="/shops">
                    <div className="drop-ic">⌂</div>
                    <div><b>Магазины</b><small>62 точки</small></div>
                  </a>
                  <a href="/jobs">
                    <div className="drop-ic">⚒</div>
                    <div><b>Слоты</b><small>54 заказа</small></div>
                  </a>
                  <a href="/locations">
                    <div className="drop-ic">⌖</div>
                    <div><b>Локации</b><small>120 мест</small></div>
                  </a>
                </div>
              </div>
              <div className="menu-item has-drop">
                <button className="menu-link">Сообщество</button>
                <div className="drop">
                  <a href="/events">
                    <div className="drop-ic">◈</div>
                    <div><b>События</b><small>38 ближайших</small></div>
                  </a>
                  <a href="/guides">
                    <div className="drop-ic">▤</div>
                    <div><b>Гайды</b><small>230 материалов</small></div>
                  </a>
                  <a href="/market">
                    <div className="drop-ic">✄</div>
                    <div><b>Барахолка</b><small>420 объявлений</small></div>
                  </a>
                  <a href="/moodboards">
                    <div className="drop-ic">◇</div>
                    <div><b>Доски</b><small>Мудборды</small></div>
                  </a>
                </div>
              </div>
              <div className="menu-item">
                <a href="/pro" className="menu-link">Pro</a>
              </div>
            </div>

            <div className="nav-search">
              <input placeholder="Поиск..." autoComplete="off" />
            </div>

            <div className="nav-cta">
              <AuthNav />
              <MobileMenu />
            </div>
          </div>
        </nav>

        <main style={{ position: "relative", zIndex: 2 }}>
          {children}
        </main>

        <footer>
          <div className="wrap">
            <div className="foot-grid">
              <div>
                <div className="logo" style={{ marginBottom: 14 }}>
                  <div className="logo-mark" />
                  КОСПЛЕЙ.ХАБ
                </div>
                <p style={{ margin: 0, lineHeight: 1.6, maxWidth: 280 }}>
                  Экосистема для косплей-сообщества Казахстана и СНГ. Бета-версия.
                </p>
              </div>
              <div>
                <h4>Люди</h4>
                <a href="/people">Косплееры</a>
                <a href="/people?role=photo">Фотографы</a>
                <a href="/looks">Образы</a>
                <a href="/teams">Команды</a>
              </div>
              <div>
                <h4>Услуги</h4>
                <a href="/workshops">Мастерские</a>
                <a href="/shops">Магазины</a>
                <a href="/locations">Локации</a>
                <a href="/jobs">Слоты</a>
              </div>
              <div>
                <h4>Сообщество</h4>
                <a href="/events">События</a>
                <a href="/guides">Гайды</a>
                <a href="/market">Барахолка</a>
                <a href="/pro">Pro</a>
              </div>
            </div>
            <div className="foot-bottom">
              <span>© 2026 КосплейХаб СНГ · Бета</span>
              <span>Казахстан · СНГ</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
