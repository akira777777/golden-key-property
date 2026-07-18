# Golden Key Property Production Checklist

## In progress

- [ ] 1. Critical reliability regression tests

## Pending

- [ ] 2. No-JS hero and mobile header/menu
- [ ] 3. Catalogue skeleton/empty/error/retry states
- [ ] 4. Working filters and complete inquiry object options
- [ ] 5. Favourites and comparison persistence/layout
- [ ] 6. SQLAlchemy database boundary
- [ ] 7. PostgreSQL/Alembic migrations
- [ ] 8. Slugs and expanded filter contract
- [ ] 9. Twenty demo records
- [ ] 10. Media rights/CDN model and import workflow
- [ ] 11. SEO property detail route
- [ ] 12. Shareable catalogue route
- [ ] 13. Area routes and cards
- [ ] 14. Why Dubai/process/FAQ/contact sections
- [ ] 15. Privacy/Cookie/Terms pages
- [ ] 16. Expanded secure lead form
- [ ] 17. Durable rate limiting
- [ ] 18. CRM webhook and fallback email
- [ ] 19. Admin/editor authentication and authorization
- [ ] 20. Protected catalogue/media/lead management
- [ ] 21. Canonical/OG/Twitter/JSON-LD metadata
- [ ] 22. Dynamic sitemap/robots and 404/500
- [ ] 23. Accessibility and reduced-motion pass
- [ ] 24. Monitoring/logging/health/backup/CSP
- [ ] 25. Complete unit/API coverage
- [ ] 26. Automated E2E coverage
- [ ] 27. Full verification and Lighthouse
- [ ] 28. Deployment and operations documentation

## Baseline evidence

- API suite: 26 passing, 2 failing stale SEO assertions.
- Desktop: primary catalogue, quick view, lead form, three-item compare, language switch, and 3D dialog are reachable.
- Mobile 390 px: document width 505 px, clipped menu/header CTA, and off-screen navigation.
- Lead form: successful local submission, but RU success copy is returned in English and required production fields are absent.
