# Daily AI - Master Project Blueprint

## 🎯 **Project Overview**

**Daily AI** is a sophisticated Progressive Web App (PWA) designed as a personal daily task manager with intelligent scheduling capabilities. This is a single-user application for personal productivity that combines real-time intelligence, offline functionality, and responsive design to create a powerful yet approachable daily task management experience.

### **Core Mission**
Create a "living schedule" that adapts intelligently to your day, automatically rescheduling flexible tasks while maintaining mandatory appointments and handling dependencies between tasks.

---

## 🏗️ **Technical Architecture**

### **Technology Stack**
- **Frontend:** HTML5, CSS3, Modern JavaScript (ES6+) - No frameworks
- **Backend:** Google Firebase
  - **Authentication:** Firebase Auth (email/password)
  - **Database:** Cloud Firestore with offline persistence
  - **Hosting:** Firebase Hosting with GitHub Actions auto-deployment
- **Development:** Modern browsers only (Chrome 100+, Firefox 100+, Safari 15.4+)
- **Deployment:** Automated via GitHub Actions on push to main

### **Data Architecture**

**Firestore Collections:**
1. `/users/{userId}` - User settings (sleep duration, wake/sleep times)
2. `/users/{userId}/tasks/{taskId}` - Task templates (recurring patterns)
3. `/users/{userId}/task_instances/{instanceId}` - Daily task modifications (completed/skipped/postponed)
4. `/users/{userId}/daily_schedules/{date}` - Sleep schedule overrides

**Key Data Concepts:**
- **Task Templates:** Define recurring tasks with rules and defaults
- **Task Instances:** Store modifications to template behavior on specific dates
- **Single Source of Truth:** JavaScript state object manages all UI rendering

---

## 🎨 **Design System: "Calm Productivity"**

### **Visual Philosophy**
Clean, minimalist interface with generous whitespace, subtle depth through soft shadows, rounded corners (8-16px), and smooth micro-animations that enhance rather than distract.

### **Color Palette (Light Mode Only)**
- **Primary:** #3B82F6 (Modern blue)
- **Success:** #10B981, **Warning:** #F59E0B, **Error:** #EF4444
- **Neutrals:** #FAFAF9 → #1C1917 (light to dark)

### **Typography**
- **Primary:** Inter font family for readability
- **Monospace:** JetBrains Mono for time displays
- **Scale:** 12px-30px with consistent hierarchy

### **Responsive Breakpoints**
- **Mobile:** 320-767px (touch-optimized, 44px minimum targets)
- **Tablet:** 768-1023px (enhanced spacing)
- **Laptop:** 1024-1439px (mouse interactions, hover states)
- **Desktop:** 1440px+ (full feature set)

---

## 🌟 **Core Features & Functionality**

### **1. Intelligent Scheduling Engine**
The "Secret Sauce" - automatically arranges tasks using sophisticated logic:
1. **Place Anchors:** Mandatory fixed-time tasks positioned first
2. **Resolve Dependencies:** Tasks with prerequisites scheduled after dependencies
3. **Slot Flexible Tasks:** Fit remaining tasks by priority within time windows
4. **Crunch-Time Adjustments:** Use minimum durations when time is tight
5. **Conflict Detection:** Alert when schedule is impossible

**Time Windows:**
- Morning: 6:00-12:00
- Afternoon: 12:00-18:00  
- Evening: 18:00-23:00
- Anytime: 6:00-23:00

### **2. Real-Time Updates (Every 30 Seconds)**
- Clock display updates
- Red timeline indicator moves smoothly
- Task state checks (overdue detection)
- Smart countdown timers between anchor tasks
- All updates batched for performance

### **3. Task Management System**

**Task Properties:**
- Name, description (optional notes)
- Duration (normal + minimum for crunch-time)
- Scheduling: Fixed time OR flexible time window
- Priority (1-5), Mandatory vs Skippable
- Dependencies (prerequisite tasks)
- Recurrence rules (daily/weekly/monthly/yearly)

**Task States:**
- **Normal:** Standard appearance
- **Completed:** Checkmark/strikethrough with animation
- **Overdue Mandatory:** Subtle red, auto-move to current time
- **Overdue Skippable:** Grayed out, stay in original position

### **4. Responsive Multi-Device Experience**

**Mobile (320-767px):**
- Bottom tab navigation
- Full-screen modals  
- Swipe day navigation
- Touch-friendly 44px minimum targets
- Floating Action Button for task creation

**Desktop (1024px+):**
- Top navigation or sidebar
- Hover states and keyboard shortcuts
- Click-to-create with + indicators
- Side-by-side modal layouts
- Multiple task columns

### **5. Offline-First Architecture**
- **Primary Storage:** IndexedDB for robust offline caching
- **Fallback:** localStorage with data size warnings
- **Sync Strategy:** Last-write-wins conflict resolution
- **Queue System:** Store offline actions for later synchronization
- **Network Awareness:** Visual indicators and graceful degradation

---

## 🔄 **User Experience Flow**

### **App Launch**
1. **First Time:** Simple email/password login (no onboarding complexity)
2. **Returning Users:** Automatic session persistence
3. **Default Settings:** 7.5h sleep, 6:30 wake, 23:00 sleep

### **Today View (Main Interface)**
- **Fixed Header:** Current date, live clock, day navigation
- **Timeline Grid:** 24-hour vertical timeline with hourly markers
- **Sleep Blocks:** Shaded non-schedulable periods
- **Task Blocks:** Visual representations with responsive sizing
- **Real-Time Indicator:** Red gradient line showing current time
- **Smart Countdown:** Time until next anchor + time required for tasks

### **Task Interactions**
- **View/Complete:** Tap/click any task to toggle complete/incomplete
- **Create:** Timeline click-to-create OR floating action button
- **Edit:** Unified modal for all task properties
- **Actions:** Save, Copy, Delete, Skip, Postpone, Mark Complete

### **Navigation & Views**
1. **Today View:** Main timeline interface
2. **Task Library:** Categorized task management
3. **Settings:** Sleep configuration and preferences

---

## 📋 **Development Phases & Current Status**

### **Phase 1: Foundation & Authentication (5/14 Complete)**
**✅ Completed:**
1. Firebase project setup with security rules and indexes
2. GitHub Actions auto-deployment
3. Basic authentication implementation
4. Error handling system implementation
5. Development environment setup

**🔄 Next Steps:**
6. **Multi-tab synchronization** (NEXT - using BroadcastChannel API)
7. Modern browser compatibility checking
8. Responsive HTML structure
9. CSS framework and design system
10. JavaScript module structure
11. Memory leak prevention
12. Default user settings initialization

### **Phase 2: Core Data Architecture** (Upcoming)
- Firestore collections and CRUD operations
- Application state management
- Offline persistence setup

### **Phase 3: Timeline Interface** (Upcoming)  
- Responsive timeline grid
- Real-time clock and indicator
- Task block rendering
- Day navigation
- Sleep block visualization

### **Phase 4-12:** Task management, real-time features, offline functionality, smart scheduling, PWA features

---

## 🚨 **Critical Implementation Requirements**

### **Security & Stability (Phase 1)**
- ✅ **Firebase Security Rules:** User-scoped data access only
- ✅ **Memory Leak Prevention:** Interval cleanup, page visibility API
- ✅ **Error Handling:** User-friendly messages, never crash
- 🔄 **Multi-tab Sync:** BroadcastChannel API for tab coordination

### **Core Functionality (Phase 2)**  
- **Cross-Midnight Tasks:** Tasks spanning midnight boundaries
- **Circular Dependency Detection:** Prevent infinite loops (A→B→A)
- **Performance Limits:** 100 task limit with warnings

### **User Experience (Phase 3)**
- **Storage Limits:** 80% capacity warnings, graceful fallback
- **PWA Caching:** Cache-first strategy for offline experience
- **DST Manual Adjustment:** User setting for time offset

---

## 🎯 **Key Design Principles**

### **Guiding Principles**
1. **Modular Code:** Clear separation of responsibilities
2. **Single Source of Truth:** Centralized application state
3. **Graceful Error Handling:** Never crash, always provide feedback
4. **Real-Time Intelligence:** Living schedule that adapts continuously
5. **Offline-First:** Full functionality without internet
6. **Mobile-First:** Touch-optimized, then enhanced for desktop

### **Technical Guidelines**
- **ES6 Modules:** Modern JavaScript without build complexity
- **Simple Solutions:** Browser alerts over complex toast systems
- **Performance:** 30-second update cycles, cached calculations
- **Accessibility:** WCAG compliance, proper focus states
- **Modern Browsers:** Chrome 100+, Firefox 100+, Safari 15.4+

---

## 🧪 **Testing Strategy**

### **Simulation Scenarios**
1. **Dependency Chain Test:** Do Laundry → Iron Clothes → Pack Trip
2. **Crunch Time Test:** 15-minute task with 10 minutes available
3. **Impossible Day Test:** 9 hours mandatory + 8 hours sleep
4. **Flexible Reschedule Test:** New anchor conflicts with flexible task

### **Responsive Testing Requirements**
- Test on all breakpoints (320px, 768px, 1024px, 1440px+)
- Verify touch targets meet 44px minimum on mobile
- Validate hover states work only on desktop
- Test swipe gestures and keyboard shortcuts
- Ensure modals display correctly (full-screen mobile, centered desktop)

---

## 🚀 **Development Workflow**

### **Current Tooling**
- **Version Control:** Git with GitHub
- **Deployment:** Firebase Hosting + GitHub Actions
- **Development:** VSCode on WSL2 (Windows 10)
- **Testing:** Modern browser dev tools
- **Database:** Firestore with local emulators

### **File Structure**
```
daily_ai/
├── docs/                    # Complete project documentation
├── firebase/               # Firestore rules and indexes
├── public/                 # Web application files
│   ├── js/
│   │   ├── utils/         # Utility modules (error handling, validation)
│   │   ├── components/    # UI components
│   │   ├── firebase.js    # Firebase integration
│   │   ├── ui.js         # UI management
│   │   ├── taskLogic.js  # Task logic & scheduling
│   │   └── app.js        # Main application entry
│   ├── css/              # Responsive stylesheets
│   └── index.html        # Main app HTML
└── .github/workflows/    # Automated deployment
```

---

## 📊 **Success Metrics**

### **Technical Goals**
- No memory leaks during 4+ hour sessions
- All Firebase operations wrapped in error handling
- Responsive design works on all target devices
- Offline functionality maintains full feature set
- Real-time updates perform smoothly on mobile networks

### **User Experience Goals**
- Intuitive task creation with smart defaults
- Smooth animations and micro-interactions
- Clear feedback for all user actions
- Graceful degradation when features unavailable
- Fast loading and instant responsiveness

### **Security & Reliability Goals**  
- User data completely isolated and protected
- No crashes under any error conditions
- Automatic sync resolution for offline changes
- Proper handling of storage limitations
- Consistent behavior across all devices

---

## 🎉 **Implementation Status**

**Current Status:** Phase 1 - Step 6 (Multi-Tab Synchronization)
**Next Action:** Implement BroadcastChannel API for tab coordination
**Overall Progress:** Foundation established, ready for systematic development

**Key Achievements:**
- ✅ Complete project planning and documentation
- ✅ Firebase infrastructure deployed
- ✅ Authentication system functional
- ✅ Error handling system implemented
- ✅ Development environment configured

**Ready for Development:** All critical planning complete, systematic implementation in progress following the structured phase approach.

---

*This master blueprint serves as the single source of truth for the Daily AI project. All development decisions and implementations should reference this document to ensure consistency with the overall project vision and requirements.*