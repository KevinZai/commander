# ccc-marketing — Python tools

Loaded by [../SKILL.md](../SKILL.md) step 4. Every script uses the Python standard library only (no `pip install`). Run each as `python3 "${CLAUDE_SKILL_DIR}/<sub-skill>/scripts/<script>"`, or from the repository root as `python3 skills/ccc-marketing/<sub-skill>/scripts/<script>`. Scripts that take a file read it as the first argument; many run on embedded sample data when given none, which is a demo, not a result. Check a script's own sub-skill SKILL.md for flags before relying on its output.

| Sub-skill | Script | What it does |
|---|---|---|
| `ab-test-setup` | `sample_size_calculator.py` | A/B test sample size |
| `ad-creative` | `ad_copy_validator.py` | Validate ad copy against platform specs |
| `analytics-tracking` | `tracking_plan_generator.py` | Event taxonomy, GTM config, GA4 dimension recommendations |
| `app-store-optimization` | `aso_scorer.py`, `keyword_analyzer.py`, `metadata_optimizer.py`, `competitor_analyzer.py`, `review_analyzer.py`, `ab_test_planner.py`, `launch_checklist.py`, `localization_helper.py` | ASO scoring, keywords, metadata, competitors, reviews, tests, launch, localization |
| `campaign-analytics` | `attribution_analyzer.py`, `campaign_roi_calculator.py`, `funnel_analyzer.py` | Multi-touch attribution, campaign ROI, funnel bottlenecks |
| `churn-prevention` | `churn_impact_calculator.py` | Revenue impact of churn reduction |
| `cold-email` | `email_sequence_analyzer.py` | Quality signals in a cold email sequence |
| `competitor-alternatives` | `comparison_matrix_builder.py` | Feature comparison matrix |
| `content-humanizer` | `humanizer_scorer.py` | 0–100 score for AI writing patterns |
| `content-production` | `content_scorer.py`, `brand_voice_analyzer.py`, `seo_optimizer.py` | 0–100 content score; brand voice consistency; on-page SEO |
| `content-strategy` | `topic_cluster_mapper.py` | Group keywords into content clusters |
| `copy-editing` | `readability_scorer.py` | Readability metrics |
| `copywriting` | `headline_scorer.py` | 0–100 headline score |
| `email-sequence` | `sequence_analyzer.py` | Lifecycle sequence quality |
| `form-cro` | `form_field_analyzer.py` | Form field friction |
| `free-tool-strategy` | `tool_roi_estimator.py` | ROI of a free marketing tool |
| `launch-strategy` | `launch_readiness_scorer.py` | Launch readiness score |
| `marketing-context` | `context_validator.py` | 0–100 completeness score for the context file |
| `marketing-demand-acquisition` | `calculate_cac.py` | Customer acquisition cost |
| `marketing-ops` | `campaign_tracker.py` | Campaign tasks, owners, deadlines |
| `onboarding-cro` | `activation_funnel_analyzer.py` | Activation funnel |
| `page-cro` | `conversion_audit.py` | CRO audit of an HTML page |
| `paid-ads` | `roas_calculator.py` | ROAS and paid metrics |
| `pricing-strategy` | `pricing_modeler.py` | Revenue at different price points, tier recommendation |
| `programmatic-seo` | `url_pattern_generator.py` | URL patterns for templated pages |
| `prompt-engineer-toolkit` | `prompt_tester.py`, `prompt_versioner.py` | A/B test prompts; version and diff prompts in a local JSONL store |
| `referral-program` | `referral_roi_calculator.py` | Referral program ROI |
| `schema-markup` | `schema_validator.py` | Extract and validate JSON-LD from HTML |
| `seo-audit` | `seo_checker.py` | On-page SEO analysis |
| `signup-flow-cro` | `funnel_drop_analyzer.py` | Signup funnel drop-off |
| `site-architecture` | `sitemap_analyzer.py` | Sitemap structure and depth |
| `social-media-analyzer` | `calculate_metrics.py`, `analyze_performance.py` | Engagement metrics and recommendations |
| `social-media-manager` | `social_calendar_generator.py` | Content calendar |

## Examples

```bash
python3 skills/ccc-marketing/content-production/scripts/content_scorer.py article.md
python3 skills/ccc-marketing/content-humanizer/scripts/humanizer_scorer.py draft.md
python3 skills/ccc-marketing/content-production/scripts/brand_voice_analyzer.py copy.txt
python3 skills/ccc-marketing/ad-creative/scripts/ad_copy_validator.py ads.json
python3 skills/ccc-marketing/pricing-strategy/scripts/pricing_modeler.py
python3 skills/ccc-marketing/analytics-tracking/scripts/tracking_plan_generator.py
```
