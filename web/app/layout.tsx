import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Unbounded, JetBrains_Mono, Manrope } from "next/font/google";
import AuthNav from "./components/AuthNav";
import CsrfFetch from "./components/CsrfFetch";
import MobileMenu from "./components/MobileMenu";
import SearchBox from "./components/SearchBox";
import { getNavStats, pl } from "../lib/api";
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const s = await getNavStats();
  return (
    <html lang="ru" className={`${unbounded.variable} ${jetbrainsMono.variable} ${manrope.variable}`}>
      <body>
        <CsrfFetch />
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
                    <div><b>Косплееры</b><small>{pl(s?.cosplayer_profiles ?? 0, ["анкета", "анкеты", "анкет"])}</small></div>
                  </a>
                  <a href="/photographers">
                    <div className="drop-ic">◐</div>
                    <div><b>Фотографы</b><small>{pl(s?.photographers ?? 0, ["профиль", "профиля", "профилей"])}</small></div>
                  </a>
                  <a href="/looks">
                    <div className="drop-ic">✧</div>
                    <div><b>Образы</b><small>{pl(s?.looks ?? 0, ["работа", "работы", "работ"])}</small></div>
                  </a>
                  <a href="/teams">
                    <div className="drop-ic">♛</div>
                    <div><b>Команды</b><small>{pl(s?.teams ?? 0, ["команда", "команды", "команд"])}</small></div>
                  </a>
                  <a href="/shoots">
                    <div className="drop-ic">◎</div>
                    <div><b>Съёмки</b><small>собрать команду</small></div>
                  </a>
                  <a href="/battles">
                    <div className="drop-ic">⚔</div>
                    <div><b>Баттлы</b><small>конкурсы образов</small></div>
                  </a>
                </div>
              </div>
              <div className="menu-item has-drop">
                <button className="menu-link">Услуги</button>
                <div className="drop">
                  <a href="/workshops">
                    <div className="drop-ic">◆</div>
                    <div><b>Мастерские</b><small>{pl(s?.workshops ?? 0, ["студия", "студии", "студий"])}</small></div>
                  </a>
                  <a href="/shops">
                    <div className="drop-ic">⌂</div>
                    <div><b>Магазины</b><small>{pl(s?.shops ?? 0, ["точка", "точки", "точек"])}</small></div>
                  </a>
                  <a href="/jobs">
                    <div className="drop-ic">⚒</div>
                    <div><b>Слоты</b><small>{pl(s?.jobs ?? 0, ["заказ", "заказа", "заказов"])}</small></div>
                  </a>
                  <a href="/locations">
                    <div className="drop-ic">⌖</div>
                    <div><b>Локации</b><small>{pl(s?.locations ?? 0, ["место", "места", "мест"])}</small></div>
                  </a>
                  <a href="/rent">
                    <div className="drop-ic">❖</div>
                    <div><b>Прокат</b><small>костюмы напрокат</small></div>
                  </a>
                </div>
              </div>
              <div className="menu-item has-drop">
                <button className="menu-link">Сообщество</button>
                <div className="drop">
                  <a href="/events">
                    <div className="drop-ic">◈</div>
                    <div><b>События</b><small>{pl(s?.events ?? 0, ["ближайшее", "ближайших", "ближайших"])}</small></div>
                  </a>
                  <a href="/guides">
                    <div className="drop-ic">▤</div>
                    <div><b>Гайды</b><small>{pl(s?.guides ?? 0, ["материал", "материала", "материалов"])}</small></div>
                  </a>
                  <a href="/market">
                    <div className="drop-ic">✄</div>
                    <div><b>Барахолка</b><small>{pl(s?.market ?? 0, ["объявление", "объявления", "объявлений"])}</small></div>
                  </a>
                </div>
              </div>
              <div className="menu-item">
                <a href="/pro" className="menu-link">Pro</a>
              </div>
            </div>

            <SearchBox />

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
                <a href="/photographers">Фотографы</a>
                <a href="/looks">Образы</a>
                <a href="/teams">Команды</a>
                <a href="/shoots">Съёмки</a>
                <a href="/battles">Баттлы</a>
              </div>
              <div>
                <h4>Услуги</h4>
                <a href="/workshops">Мастерские</a>
                <a href="/shops">Магазины</a>
                <a href="/locations">Локации</a>
                <a href="/jobs">Слоты</a>
                <a href="/rent">Прокат</a>
              </div>
              <div>
                <h4>Сообщество</h4>
                <a href="/events">События</a>
                <a href="/guides">Гайды</a>
                <a href="/market">Барахолка</a>
                <a href="/pro">Pro</a>
              </div>
              <div>
                <h4>Документы</h4>
                <a href="/legal/terms">Соглашение</a>
                <a href="/legal/privacy">Конфиденциальность</a>
                <a href="/legal/offer">Оферта</a>
                <a href="/legal/rules">Правила</a>
                <a href="/legal/cookies">Cookie</a>
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
