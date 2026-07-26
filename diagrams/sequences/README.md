# Sequence Diagrams

These PlantUML diagrams cover the user-facing and backend-job features listed for the academic planning system.

Implemented backend contracts are drawn with the current route names from `backend/src`. Features that do not yet have a dedicated route are still diagrammed, but the diagram includes a note that the route is proposed or frontend-orchestrated.

## Feature Coverage

- `01_auth_register.wsd` - Auth register
- `02_auth_login.wsd` - Auth login
- `03_course_catalog_search_modules.wsd` - Browse the paginated course catalog
- `04_course_catalog_create_module_review.wsd` - Create module review
- `05_course_catalog_edit_module_review.wsd` - Edit module review
- `06_course_catalog_delete_module_review.wsd` - Delete module review
- `07_header_search_modules.wsd` - Header/top-nav module search
- `08_dashboard_create_semester.wsd` - Create semester
- `09_dashboard_add_selected_exempted_planned_module.wsd` - Add selected, exempted, or planned module
- `10_dashboard_update_module_status.wsd` - Update module status
- `11_dashboard_delete_module.wsd` - Delete module from planner
- `12_timetable_edit_lesson_slots.wsd` - Edit selected timetable lesson slots
- `13_marketplace_create_public_plan.wsd` - Create one public degree plan from the dashboard
- `14_marketplace_delete_public_plan.wsd` - Delete the current user's public degree plan
- `15_marketplace_upvote_public_plan.wsd` - Upvote public plan, proposed route
- `16_marketplace_create_public_plan_comment.wsd` - Create public plan comment
- `17_marketplace_edit_public_plan_comment.wsd` - Edit public plan comment, proposed route
- `18_marketplace_delete_public_plan_comment.wsd` - Delete public plan comment
- `19_marketplace_copy_public_plan_into_workspace.wsd` - Proposed frontend orchestration for copying a public plan
- `20_backend_scheduled_nusmods_sync.wsd` - Scheduled NUSMods sync
- `21_backend_manual_nusmods_sync.wsd` - Manual NUSMods sync
- `22_backend_module_change_email_notification.wsd` - Resend notification delivery for relevant NUSMods changes
- `23_marketplace_view_public_plan.wsd` - View a public plan and increment its view count
- `24_marketplace_update_public_plan.wsd` - Update the current user's public degree plan
