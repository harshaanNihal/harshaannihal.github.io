// Portfolio behavior, one module per feature. Every feature is optional: the page reads fine without any of it.
import { initCalendar } from './calendar';
import { initCases } from './cases';
import { initConstellations } from './constellation';
import { initCopyEmail } from './copy-email';
import { initFileView } from './file-view';
import { initMenu } from './menu';
import { initMoonlight } from './moonlight';
import { initNavSpy } from './nav-spy';
import { initReveal } from './reveal';
import { initSkillsSky } from './skills-sky';
import { initSkyRooms } from './sky-rooms';
import { initTheme } from './theme';

initTheme();
initMenu();
initReveal();
initNavSpy();
initCases();
initCopyEmail();
initSkillsSky();
initMoonlight();
initSkyRooms();
initConstellations();
initCalendar();
initFileView();

/* For anyone who opens the console. */
const email = document.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')?.href.slice('mailto:'.length);
console.log(`%cHi, fellow engineer.%c Everything that moves on this page is hand-written CSS, SVG and a 2D canvas, no libraries. Have a role, a project or a question in mind? My inbox is open: ${email}`, 'color:#c9a227;font-weight:700', '');
