# Shikha Verma — Data Analyst Portfolio

[![Deploy to GitHub Pages](https://github.com/shikhaverma09/data-analyst-portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/shikhaverma09/data-analyst-portfolio/actions/workflows/deploy.yml)

**Live site:** https://shikhaverma09.github.io/data-analyst-portfolio/

Personal portfolio of an entry-level Data Analyst skilled in **Excel, SQL, Power BI, Tableau** and **Python (pandas, NumPy, Matplotlib)**.

## Highlights

- **Cinematic "series" theme:** a streaming-style billboard hero, a "Who's watching?" path picker (Recruiter / Hiring manager / Curious), a skills row, a career journey told as episodes, and a one-page résumé ("The Full Story").

- **Interactive Sales Performance Dashboard:** a live, in-browser recreation of my Excel sales dashboard. Filter by region, category and metric, hover for exact values, click bars to cross-filter, and switch to a table view.
- Internship experience, skills, education and certifications.
- Fully responsive (tested from 320px phones to 2560px monitors), keyboard accessible, ~60fps scrolling.

## Tech

Plain HTML, CSS and JavaScript. No frameworks or build step, so the site loads fast. Charts are hand-built SVG.

```
index.html
assets/
  css/style.css
  js/main.js          # navigation, scroll reveals, skill row, copy email
  js/dashboard.js     # interactive sales dashboard
  img/favicon.svg
  img/shikha-verma*.jpg   # portrait (full + small for phones)
  Shikha_Verma_Resume.pdf
.github/workflows/deploy.yml   # auto-deploys to GitHub Pages on every push to main
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Contact

- Email: work.shikhaverma@gmail.com
- LinkedIn: [linkedin.com/in/shikha-verma9112](https://www.linkedin.com/in/shikha-verma9112)

> Dashboard figures are illustrative sample data used to demonstrate the analysis and visualisation approach.
