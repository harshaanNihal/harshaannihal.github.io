// Where the portfolio's API lives (the contact form and the visit counter). Set PUBLIC_API_URL at build time;
// without it the site builds without the form and without counting, as it did before the API existed.
export const apiUrl = import.meta.env.PUBLIC_API_URL?.replace(/\/$/, '') || null;
