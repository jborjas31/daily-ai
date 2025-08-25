/**
 * Task List Component
 * 
 * Comprehensive task template management interface with categorization,
 * search, filtering, status management, and bulk operations
 */

import { state } from '../state.js';
import { taskTemplateManager, TIME_WINDOWS } from '../taskLogic.js';
import { taskModal } from './TaskModal.js';
import { SimpleErrorHandler } from '../utils/SimpleErrorHandler.js';
import { SafeTimeout, SafeEventListener, ComponentManager } from '../utils/MemoryLeakPrevention.js';

/**
 * Task List Controller
 */
export class TaskList {
  constructor() {
    this.containerElement = null;
    this.currentView = 'library'; // 'library', 'active', 'inactive'
    this.currentCategory = 'all'; // 'all', 'priority', 'timeWindow', 'scheduling'
    this.currentSort = 'name'; // 'name', 'priority', 'created', 'modified'
    this.sortDirection = 'asc'; // 'asc', 'desc'
    this.searchQuery = '';
    this.selectedTasks = new Set();
    this.currentFilters = {
      priority: 'all',
      timeWindow: 'all',
      schedulingType: 'all',
      isMandatory: 'all',
      isActive: 'all'
    };
    
    // Memory leak prevention tracking
    this.eventListeners = [];
    this.timeouts = [];
    
    // Register with memory manager
    ComponentManager.register(this);
    
    // Bind methods
    this.render = this.render.bind(this);
    this.handleTemplateChange = this.handleTemplateChange.bind(this);
    
    // Subscribe to state changes
    this.subscribeToStateChanges();
  }

  /**
   * Subscribe to template state changes
   */
  subscribeToStateChanges() {
    // Listen for template changes
    document.addEventListener('stateChanged', this.handleTemplateChange);
  }

  /**
   * Handle template state changes
   */
  handleTemplateChange(event) {
    if (event.detail?.type?.includes('taskTemplate') || event.detail?.type?.includes('TEMPLATE')) {
      // Refresh the view
      this.refreshView();
    }
  }

  /**
   * Initialize the task list in a container element
   */
  init(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error('TaskList: Container not found:', containerSelector);
      return;
    }
    
    this.containerElement = container;
    this.render();
    this.setupEventListeners();
  }

  /**
   * Render the complete task list interface
   */
  render() {
    if (!this.containerElement) return;
    
    // Clear existing content
    this.containerElement.innerHTML = '';
    
    // Get template data
    const templates = this.getFilteredAndSortedTemplates();
    const templateStats = this.getTemplateStats(templates);
    
    // Create main HTML structure
    const html = `
      <div class="task-list-container">
        ${this.renderHeader(templateStats)}
        ${this.renderToolbar()}
        ${this.renderFiltersPanel()}
        ${this.renderBulkActionsBar()}
        ${this.renderTaskGrid(templates)}
        ${this.renderPagination(templates)}
      </div>
    `;
    
    this.containerElement.innerHTML = html;
  }

  /**
   * Render the header section with stats and view controls
   */
  renderHeader(stats) {
    return `
      <div class="task-list-header">
        <div class="header-main">
          <h2 class="header-title">
            📚 Task Library
            <span class="template-count">${stats.total} templates</span>
          </h2>
          
          <div class="header-actions">
            <button type="button" class="btn btn-primary" id="create-template-btn">
              ➕ Create Template
            </button>
            <button type="button" class="btn btn-secondary" id="import-templates-btn">
              📥 Import
            </button>
            <button type="button" class="btn btn-secondary" id="export-templates-btn">
              📤 Export
            </button>
          </div>
        </div>
        
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-label">Active:</span>
            <span class="stat-value active">${stats.active}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Inactive:</span>
            <span class="stat-value inactive">${stats.inactive}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">High Priority:</span>
            <span class="stat-value priority">${stats.highPriority}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mandatory:</span>
            <span class="stat-value mandatory">${stats.mandatory}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the toolbar with view controls and search
   */
  renderToolbar() {
    return `
      <div class="task-list-toolbar">
        <div class="toolbar-left">
          <div class="view-switcher">
            <button type="button" class="view-btn ${this.currentView === 'library' ? 'active' : ''}" data-view="library">
              📚 All Templates
            </button>
            <button type="button" class="view-btn ${this.currentView === 'active' ? 'active' : ''}" data-view="active">
              ✅ Active Only
            </button>
            <button type="button" class="view-btn ${this.currentView === 'inactive' ? 'active' : ''}" data-view="inactive">
              ⏸️ Inactive Only
            </button>
          </div>
          
          <div class="category-switcher">
            <select id="category-select" class="select">
              <option value="all" ${this.currentCategory === 'all' ? 'selected' : ''}>All Categories</option>
              <option value="priority" ${this.currentCategory === 'priority' ? 'selected' : ''}>By Priority</option>
              <option value="timeWindow" ${this.currentCategory === 'timeWindow' ? 'selected' : ''}>By Time Window</option>
              <option value="scheduling" ${this.currentCategory === 'scheduling' ? 'selected' : ''}>By Scheduling Type</option>
            </select>
          </div>
        </div>
        
        <div class="toolbar-center">
          <div class="search-box">
            <input 
              type="text" 
              id="search-input" 
              class="search-input" 
              placeholder="🔍 Search templates..."
              value="${this.searchQuery}"
            />
            <button type="button" id="clear-search-btn" class="clear-search-btn" ${!this.searchQuery ? 'style="display: none;"' : ''}>
              ×
            </button>
          </div>
        </div>
        
        <div class="toolbar-right">
          <div class="sort-controls">
            <select id="sort-select" class="select">
              <option value="name" ${this.currentSort === 'name' ? 'selected' : ''}>Sort by Name</option>
              <option value="priority" ${this.currentSort === 'priority' ? 'selected' : ''}>Sort by Priority</option>
              <option value="created" ${this.currentSort === 'created' ? 'selected' : ''}>Sort by Created</option>
              <option value="modified" ${this.currentSort === 'modified' ? 'selected' : ''}>Sort by Modified</option>
            </select>
            <button type="button" id="sort-direction-btn" class="sort-direction-btn" title="Toggle sort direction">
              ${this.sortDirection === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>
          
          <button type="button" id="toggle-filters-btn" class="btn btn-secondary">
            🔧 Filters
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render the filters panel
   */
  renderFiltersPanel() {
    return `
      <div class="task-list-filters" id="filters-panel" style="display: none;">
        <div class="filters-content">
          <div class="filter-section">
            <h4>🎯 Priority</h4>
            <select id="priority-filter" class="filter-select">
              <option value="all" ${this.currentFilters.priority === 'all' ? 'selected' : ''}>All Priorities</option>
              <option value="5" ${this.currentFilters.priority === '5' ? 'selected' : ''}>🔥 Highest (5)</option>
              <option value="4" ${this.currentFilters.priority === '4' ? 'selected' : ''}>🔴 High (4)</option>
              <option value="3" ${this.currentFilters.priority === '3' ? 'selected' : ''}>🟡 Medium (3)</option>
              <option value="2" ${this.currentFilters.priority === '2' ? 'selected' : ''}>🔵 Low (2)</option>
              <option value="1" ${this.currentFilters.priority === '1' ? 'selected' : ''}>⚪ Lowest (1)</option>
            </select>
          </div>
          
          <div class="filter-section">
            <h4>⏰ Time Window</h4>
            <select id="time-window-filter" class="filter-select">
              <option value="all" ${this.currentFilters.timeWindow === 'all' ? 'selected' : ''}>All Windows</option>
              ${Object.entries(TIME_WINDOWS).map(([key, window]) => `
                <option value="${key}" ${this.currentFilters.timeWindow === key ? 'selected' : ''}>
                  ${window.label}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="filter-section">
            <h4>📅 Scheduling</h4>
            <select id="scheduling-filter" class="filter-select">
              <option value="all" ${this.currentFilters.schedulingType === 'all' ? 'selected' : ''}>All Types</option>
              <option value="flexible" ${this.currentFilters.schedulingType === 'flexible' ? 'selected' : ''}>🤖 Flexible</option>
              <option value="fixed" ${this.currentFilters.schedulingType === 'fixed' ? 'selected' : ''}>🕒 Fixed Time</option>
            </select>
          </div>
          
          <div class="filter-section">
            <h4>🔒 Requirements</h4>
            <select id="mandatory-filter" class="filter-select">
              <option value="all" ${this.currentFilters.isMandatory === 'all' ? 'selected' : ''}>All Tasks</option>
              <option value="true" ${this.currentFilters.isMandatory === 'true' ? 'selected' : ''}>🔒 Mandatory Only</option>
              <option value="false" ${this.currentFilters.isMandatory === 'false' ? 'selected' : ''}>📋 Optional Only</option>
            </select>
          </div>
          
          <div class="filter-section">
            <h4>⚡ Status</h4>
            <select id="status-filter" class="filter-select">
              <option value="all" ${this.currentFilters.isActive === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="true" ${this.currentFilters.isActive === 'true' ? 'selected' : ''}>✅ Active Only</option>
              <option value="false" ${this.currentFilters.isActive === 'false' ? 'selected' : ''}>⏸️ Inactive Only</option>
            </select>
          </div>
          
          <div class="filter-actions">
            <button type="button" id="clear-filters-btn" class="btn btn-secondary">
              🗑️ Clear Filters
            </button>
            <button type="button" id="apply-filters-btn" class="btn btn-primary">
              ✅ Apply Filters
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render bulk actions bar
   */
  renderBulkActionsBar() {
    const selectedCount = this.selectedTasks.size;
    
    return `
      <div class="bulk-actions-bar" id="bulk-actions-bar" style="display: ${selectedCount > 0 ? 'flex' : 'none'};">
        <div class="bulk-selection">
          <span class="selection-count">${selectedCount} template${selectedCount !== 1 ? 's' : ''} selected</span>
          <button type="button" id="select-all-btn" class="btn btn-link">Select All</button>
          <button type="button" id="deselect-all-btn" class="btn btn-link">Deselect All</button>
        </div>
        
        <div class="bulk-actions">
          <button type="button" id="bulk-activate-btn" class="btn btn-success">
            ✅ Activate Selected
          </button>
          <button type="button" id="bulk-deactivate-btn" class="btn btn-warning">
            ⏸️ Deactivate Selected
          </button>
          <button type="button" id="bulk-duplicate-btn" class="btn btn-secondary">
            📄 Duplicate Selected
          </button>
          <button type="button" id="bulk-export-btn" class="btn btn-secondary">
            📤 Export Selected
          </button>
          <button type="button" id="bulk-delete-btn" class="btn btn-danger">
            🗑️ Delete Selected
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render the task grid with templates
   */
  renderTaskGrid(templates) {
    if (templates.length === 0) {
      return this.renderEmptyState();
    }
    
    if (this.currentCategory !== 'all') {
      return this.renderCategorizedGrid(templates);
    }
    
    return `
      <div class="task-grid">
        ${templates.map(template => this.renderTaskCard(template)).join('')}
      </div>
    `;
  }

  /**
   * Render categorized task grid
   */
  renderCategorizedGrid(templates) {
    const categorized = this.categorizeTemplates(templates);
    
    return `
      <div class="categorized-grid">
        ${Object.entries(categorized).map(([category, templates]) => `
          <div class="category-section">
            <h3 class="category-header">
              ${this.getCategoryDisplayName(category)}
              <span class="category-count">${templates.length}</span>
            </h3>
            <div class="task-grid">
              ${templates.map(template => this.renderTaskCard(template)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render individual task card
   */
  renderTaskCard(template) {
    const isSelected = this.selectedTasks.has(template.id);
    const priorityIcon = this.getPriorityIcon(template.priority);
    const statusIcon = template.isActive !== false ? '✅' : '⏸️';
    const statusClass = template.isActive !== false ? 'active' : 'inactive';
    const mandatoryIcon = template.isMandatory ? '🔒' : '📋';
    const schedulingIcon = template.schedulingType === 'fixed' ? '🕒' : '🤖';
    
    return `
      <div class="task-card ${statusClass} ${isSelected ? 'selected' : ''}" data-template-id="${template.id}">
        <div class="task-card-header">
          <div class="task-selection">
            <input 
              type="checkbox" 
              class="task-checkbox" 
              data-template-id="${template.id}"
              ${isSelected ? 'checked' : ''}
            />
          </div>
          <div class="task-status">
            <span class="status-indicator" title="${template.isActive !== false ? 'Active' : 'Inactive'}">
              ${statusIcon}
            </span>
          </div>
          <div class="task-actions">
            <button type="button" class="action-btn edit-btn" data-template-id="${template.id}" title="Edit">
              ✏️
            </button>
            <button type="button" class="action-btn duplicate-btn" data-template-id="${template.id}" title="Duplicate">
              📄
            </button>
            <button type="button" class="action-btn toggle-status-btn" data-template-id="${template.id}" title="Toggle Status">
              ${template.isActive !== false ? '⏸️' : '✅'}
            </button>
          </div>
        </div>
        
        <div class="task-card-body">
          <h4 class="task-name">${this.escapeHtml(template.taskName)}</h4>
          
          ${template.description ? `
            <p class="task-description">${this.escapeHtml(template.description)}</p>
          ` : ''}
          
          <div class="task-meta">
            <div class="meta-row">
              <span class="meta-item">
                ${priorityIcon} Priority ${template.priority}
              </span>
              <span class="meta-item">
                ⏱️ ${template.durationMinutes}min
              </span>
            </div>
            <div class="meta-row">
              <span class="meta-item">
                ${mandatoryIcon} ${template.isMandatory ? 'Mandatory' : 'Optional'}
              </span>
              <span class="meta-item">
                ${schedulingIcon} ${template.schedulingType === 'fixed' ? 'Fixed' : 'Flexible'}
              </span>
            </div>
            ${template.schedulingType === 'flexible' && template.timeWindow ? `
              <div class="meta-row">
                <span class="meta-item">
                  🕐 ${TIME_WINDOWS[template.timeWindow]?.label || template.timeWindow}
                </span>
              </div>
            ` : ''}
            ${template.schedulingType === 'fixed' && template.defaultTime ? `
              <div class="meta-row">
                <span class="meta-item">
                  🕒 ${template.defaultTime}
                </span>
              </div>
            ` : ''}
          </div>
          
          ${template.dependsOn && template.dependsOn.length > 0 ? `
            <div class="task-dependencies">
              <small>🔗 ${template.dependsOn.length} dependenc${template.dependsOn.length !== 1 ? 'ies' : 'y'}</small>
            </div>
          ` : ''}
          
          <div class="task-recurrence">
            <small>🔄 ${this.getRecurrenceDisplay(template.recurrenceRule)}</small>
          </div>
        </div>
        
        <div class="task-card-footer">
          <div class="task-timestamps">
            ${template.createdAt ? `
              <small class="created-at">Created: ${new Date(template.createdAt).toLocaleDateString()}</small>
            ` : ''}
            ${template.modifiedAt ? `
              <small class="modified-at">Modified: ${new Date(template.modifiedAt).toLocaleDateString()}</small>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    const hasFilters = this.hasActiveFilters();
    
    return `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3 class="empty-title">
          ${hasFilters ? 'No templates match your filters' : 'No task templates yet'}
        </h3>
        <p class="empty-description">
          ${hasFilters ? 
            'Try adjusting your search or filter criteria to find templates.' :
            'Create your first task template to get started with automated daily scheduling.'
          }
        </p>
        <div class="empty-actions">
          ${hasFilters ? `
            <button type="button" id="clear-all-filters-btn" class="btn btn-secondary">
              🗑️ Clear All Filters
            </button>
          ` : ''}
          <button type="button" id="create-first-template-btn" class="btn btn-primary">
            ➕ Create Your First Template
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render pagination (placeholder for future implementation)
   */
  renderPagination(templates) {
    // For now, just return empty string
    // In the future, implement pagination for large template sets
    templates; // Mark parameter as used for now
    return '';
  }

  /**
   * Get filtered and sorted templates
   */
  getFilteredAndSortedTemplates() {
    let templates = state.getTaskTemplates() || [];
    
    // Apply view filter
    if (this.currentView === 'active') {
      templates = templates.filter(t => t.isActive !== false);
    } else if (this.currentView === 'inactive') {
      templates = templates.filter(t => t.isActive === false);
    }
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      templates = templates.filter(template => 
        template.taskName.toLowerCase().includes(query) ||
        (template.description && template.description.toLowerCase().includes(query))
      );
    }
    
    // Apply detailed filters
    templates = this.applyDetailedFilters(templates);
    
    // Apply sorting
    templates = this.sortTemplates(templates);
    
    return templates;
  }

  /**
   * Apply detailed filters
   */
  applyDetailedFilters(templates) {
    return templates.filter(template => {
      // Priority filter
      if (this.currentFilters.priority !== 'all' && 
          template.priority !== parseInt(this.currentFilters.priority)) {
        return false;
      }
      
      // Time window filter
      if (this.currentFilters.timeWindow !== 'all' && 
          template.timeWindow !== this.currentFilters.timeWindow) {
        return false;
      }
      
      // Scheduling type filter
      if (this.currentFilters.schedulingType !== 'all' && 
          template.schedulingType !== this.currentFilters.schedulingType) {
        return false;
      }
      
      // Mandatory filter
      if (this.currentFilters.isMandatory !== 'all') {
        const isMandatory = this.currentFilters.isMandatory === 'true';
        if (!!template.isMandatory !== isMandatory) {
          return false;
        }
      }
      
      // Active status filter
      if (this.currentFilters.isActive !== 'all') {
        const isActive = this.currentFilters.isActive === 'true';
        const templateIsActive = template.isActive !== false;
        if (templateIsActive !== isActive) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Sort templates by current criteria
   */
  sortTemplates(templates) {
    const multiplier = this.sortDirection === 'asc' ? 1 : -1;
    
    return templates.sort((a, b) => {
      let comparison = 0;
      
      switch (this.currentSort) {
        case 'name':
          comparison = a.taskName.localeCompare(b.taskName);
          break;
        case 'priority':
          comparison = (b.priority || 3) - (a.priority || 3); // High priority first
          break;
        case 'created':
          comparison = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          break;
        case 'modified':
          comparison = new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0);
          break;
        default:
          comparison = a.taskName.localeCompare(b.taskName);
      }
      
      return comparison * multiplier;
    });
  }

  /**
   * Categorize templates based on current category setting
   */
  categorizeTemplates(templates) {
    const categories = {};
    
    templates.forEach(template => {
      let categoryKey = '';
      
      switch (this.currentCategory) {
        case 'priority':
          categoryKey = `Priority ${template.priority || 3}`;
          break;
        case 'timeWindow':
          if (template.schedulingType === 'fixed') {
            categoryKey = 'Fixed Time Tasks';
          } else {
            const window = TIME_WINDOWS[template.timeWindow] || { label: template.timeWindow || 'Anytime' };
            categoryKey = window.label;
          }
          break;
        case 'scheduling':
          categoryKey = template.schedulingType === 'fixed' ? 'Fixed Time Tasks' : 'Flexible Tasks';
          break;
        default:
          categoryKey = 'All Templates';
      }
      
      if (!categories[categoryKey]) {
        categories[categoryKey] = [];
      }
      categories[categoryKey].push(template);
    });
    
    return categories;
  }

  /**
   * Get template statistics
   */
  getTemplateStats(templates) {
    return {
      total: templates.length,
      active: templates.filter(t => t.isActive !== false).length,
      inactive: templates.filter(t => t.isActive === false).length,
      highPriority: templates.filter(t => (t.priority || 3) >= 4).length,
      mandatory: templates.filter(t => t.isMandatory).length
    };
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    if (!this.containerElement) return;
    
    // Clear existing listeners
    this.clearEventListeners();
    
    // === Header Actions ===
    this.addEventListeners([
      // Create template button
      ['#create-template-btn', 'click', () => this.handleCreateTemplate()],
      ['#create-first-template-btn', 'click', () => this.handleCreateTemplate()],
      
      // Import/Export buttons
      ['#import-templates-btn', 'click', () => this.handleImportTemplates()],
      ['#export-templates-btn', 'click', () => this.handleExportTemplates()],
      
      // === Toolbar Controls ===
      
      // View switcher buttons
      ['.view-btn', 'click', (e) => this.handleViewSwitch(e.target.dataset.view)],
      
      // Category and sort controls
      ['#category-select', 'change', (e) => this.handleCategoryChange(e.target.value)],
      ['#sort-select', 'change', (e) => this.handleSortChange(e.target.value)],
      ['#sort-direction-btn', 'click', () => this.handleSortDirectionToggle()],
      
      // Search functionality
      ['#search-input', 'input', (e) => this.handleSearchInput(e.target.value)],
      ['#clear-search-btn', 'click', () => this.handleClearSearch()],
      
      // Filters toggle
      ['#toggle-filters-btn', 'click', () => this.handleToggleFilters()],
      
      // === Filters Panel ===
      
      // Filter controls
      ['#priority-filter', 'change', (e) => this.handleFilterChange('priority', e.target.value)],
      ['#time-window-filter', 'change', (e) => this.handleFilterChange('timeWindow', e.target.value)],
      ['#scheduling-filter', 'change', (e) => this.handleFilterChange('schedulingType', e.target.value)],
      ['#mandatory-filter', 'change', (e) => this.handleFilterChange('isMandatory', e.target.value)],
      ['#status-filter', 'change', (e) => this.handleFilterChange('isActive', e.target.value)],
      
      // Filter actions
      ['#clear-filters-btn', 'click', () => this.handleClearFilters()],
      ['#clear-all-filters-btn', 'click', () => this.handleClearAllFilters()],
      ['#apply-filters-btn', 'click', () => this.handleApplyFilters()],
      
      // === Selection and Bulk Actions ===
      
      // Selection controls
      ['#select-all-btn', 'click', () => this.handleSelectAll()],
      ['#deselect-all-btn', 'click', () => this.handleDeselectAll()],
      
      // Individual task checkboxes (delegated)
      ['.task-checkbox', 'change', (e) => this.handleTaskSelection(e.target.dataset.templateId, e.target.checked)],
      
      // Bulk actions
      ['#bulk-activate-btn', 'click', () => this.handleBulkAction('activate')],
      ['#bulk-deactivate-btn', 'click', () => this.handleBulkAction('deactivate')],
      ['#bulk-duplicate-btn', 'click', () => this.handleBulkAction('duplicate')],
      ['#bulk-export-btn', 'click', () => this.handleBulkAction('export')],
      ['#bulk-delete-btn', 'click', () => this.handleBulkAction('delete')],
      
      // === Task Card Actions ===
      
      // Individual task actions (delegated)
      ['.edit-btn', 'click', (e) => this.handleEditTemplate(e.target.dataset.templateId)],
      ['.duplicate-btn', 'click', (e) => this.handleDuplicateTemplate(e.target.dataset.templateId)],
      ['.toggle-status-btn', 'click', (e) => this.handleToggleTemplateStatus(e.target.dataset.templateId)]
    ]);
  }

  /**
   * Add multiple event listeners with proper cleanup tracking
   */
  addEventListeners(listenerConfigs) {
    listenerConfigs.forEach(([selector, event, handler]) => {
      const elements = this.containerElement.querySelectorAll(selector);
      elements.forEach(element => {
        const listenerId = SafeEventListener.add(
          element,
          event,
          handler,
          { description: `TaskList ${selector} ${event}` }
        );
        this.eventListeners.push(listenerId);
      });
    });
  }

  /**
   * Clear all event listeners
   */
  clearEventListeners() {
    this.eventListeners.forEach(listenerId => {
      SafeEventListener.remove(listenerId);
    });
    this.eventListeners = [];
  }

  // === Event Handlers ===

  /**
   * Handle create template button
   */
  handleCreateTemplate() {
    taskModal.showCreate({}, (newTemplate) => {
      if (newTemplate) {
        SimpleErrorHandler.showSuccess('Template created successfully!');
        this.refreshView();
      }
    });
  }

  /**
   * Handle view switch
   */
  handleViewSwitch(view) {
    this.currentView = view;
    this.selectedTasks.clear(); // Clear selection when switching views
    this.refreshView();
  }

  /**
   * Handle category change
   */
  handleCategoryChange(category) {
    this.currentCategory = category;
    this.refreshView();
  }

  /**
   * Handle sort change
   */
  handleSortChange(sortBy) {
    this.currentSort = sortBy;
    this.refreshView();
  }

  /**
   * Handle sort direction toggle
   */
  handleSortDirectionToggle() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.refreshView();
  }

  /**
   * Handle search input
   */
  handleSearchInput(query) {
    this.searchQuery = query.trim();
    
    // Debounce search to avoid excessive re-renders
    if (this.searchTimeout) {
      SafeTimeout.clear(this.searchTimeout);
    }
    
    this.searchTimeout = SafeTimeout.set(() => {
      this.refreshView();
    }, 300, 'TaskList search debounce');
    
    this.timeouts.push(this.searchTimeout);
  }

  /**
   * Handle clear search
   */
  handleClearSearch() {
    this.searchQuery = '';
    this.refreshView();
  }

  /**
   * Handle toggle filters panel
   */
  handleToggleFilters() {
    const filtersPanel = this.containerElement.querySelector('#filters-panel');
    if (filtersPanel) {
      const isVisible = filtersPanel.style.display !== 'none';
      filtersPanel.style.display = isVisible ? 'none' : 'block';
      
      // Update button text
      const toggleBtn = this.containerElement.querySelector('#toggle-filters-btn');
      if (toggleBtn) {
        toggleBtn.textContent = isVisible ? '🔧 Filters' : '🔧 Hide Filters';
      }
    }
  }

  /**
   * Handle filter change
   */
  handleFilterChange(filterType, value) {
    this.currentFilters[filterType] = value;
    // Auto-apply filters on change
    this.refreshView();
  }

  /**
   * Handle clear filters
   */
  handleClearFilters() {
    this.currentFilters = {
      priority: 'all',
      timeWindow: 'all',
      schedulingType: 'all',
      isMandatory: 'all',
      isActive: 'all'
    };
    this.refreshView();
  }

  /**
   * Handle clear all filters and search
   */
  handleClearAllFilters() {
    this.searchQuery = '';
    this.handleClearFilters();
  }

  /**
   * Handle apply filters (currently auto-applied)
   */
  handleApplyFilters() {
    this.refreshView();
  }

  /**
   * Handle select all templates
   */
  handleSelectAll() {
    const templates = this.getFilteredAndSortedTemplates();
    templates.forEach(template => {
      this.selectedTasks.add(template.id);
    });
    this.updateBulkActionsBar();
    this.updateTaskCardSelections();
  }

  /**
   * Handle deselect all templates
   */
  handleDeselectAll() {
    this.selectedTasks.clear();
    this.updateBulkActionsBar();
    this.updateTaskCardSelections();
  }

  /**
   * Handle individual task selection
   */
  handleTaskSelection(templateId, isSelected) {
    if (isSelected) {
      this.selectedTasks.add(templateId);
    } else {
      this.selectedTasks.delete(templateId);
    }
    
    this.updateBulkActionsBar();
    this.updateTaskCardAppearance(templateId);
  }

  /**
   * Handle bulk actions
   */
  async handleBulkAction(action) {
    const selectedIds = Array.from(this.selectedTasks);
    if (selectedIds.length === 0) {
      SimpleErrorHandler.showWarning('Please select templates to perform bulk actions.');
      return;
    }
    
    try {
      let confirmMessage = '';
      let successMessage = '';
      
      switch (action) {
        case 'activate':
          confirmMessage = `Activate ${selectedIds.length} selected template${selectedIds.length !== 1 ? 's' : ''}?`;
          successMessage = 'Templates activated successfully!';
          break;
        case 'deactivate':
          confirmMessage = `Deactivate ${selectedIds.length} selected template${selectedIds.length !== 1 ? 's' : ''}?`;
          successMessage = 'Templates deactivated successfully!';
          break;
        case 'duplicate':
          confirmMessage = `Duplicate ${selectedIds.length} selected template${selectedIds.length !== 1 ? 's' : ''}?`;
          successMessage = 'Templates duplicated successfully!';
          break;
        case 'export':
          await this.handleBulkExport(selectedIds);
          return;
        case 'delete':
          confirmMessage = `Delete ${selectedIds.length} selected template${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`;
          successMessage = 'Templates deleted successfully!';
          break;
      }
      
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Show loading state
      this.showBulkActionLoading(true);
      
      // Perform bulk action
      switch (action) {
        case 'activate':
          await taskTemplateManager.bulkActivate(selectedIds);
          break;
        case 'deactivate':
          await taskTemplateManager.bulkDeactivate(selectedIds);
          break;
        case 'duplicate':
          for (const id of selectedIds) {
            await taskTemplateManager.duplicateTemplate(id);
          }
          break;
        case 'delete':
          for (const id of selectedIds) {
            await taskTemplateManager.deleteTemplate(id);
          }
          break;
      }
      
      SimpleErrorHandler.showSuccess(successMessage);
      this.selectedTasks.clear();
      this.refreshView();
      
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      SimpleErrorHandler.showError(`Failed to ${action} templates. Please try again.`, error);
    } finally {
      this.showBulkActionLoading(false);
    }
  }

  /**
   * Handle individual template edit
   */
  handleEditTemplate(templateId) {
    const template = state.getTaskTemplateById(templateId);
    if (!template) {
      SimpleErrorHandler.showError('Template not found.');
      return;
    }
    
    taskModal.showEdit(template, (updatedTemplate) => {
      if (updatedTemplate) {
        SimpleErrorHandler.showSuccess('Template updated successfully!');
        this.refreshView();
      }
    });
  }

  /**
   * Handle individual template duplicate
   */
  async handleDuplicateTemplate(templateId) {
    try {
      await taskTemplateManager.duplicateTemplate(templateId);
      SimpleErrorHandler.showSuccess('Template duplicated successfully!');
      this.refreshView();
    } catch (error) {
      console.error('Duplicate template error:', error);
      SimpleErrorHandler.showError('Failed to duplicate template. Please try again.', error);
    }
  }

  /**
   * Handle individual template status toggle
   */
  async handleToggleTemplateStatus(templateId) {
    try {
      const template = state.getTaskTemplateById(templateId);
      if (!template) {
        SimpleErrorHandler.showError('Template not found.');
        return;
      }
      
      const newStatus = !template.isActive;
      await taskTemplateManager.updateTemplate(templateId, { isActive: newStatus });
      
      const statusText = newStatus ? 'activated' : 'deactivated';
      SimpleErrorHandler.showSuccess(`Template ${statusText} successfully!`);
      this.refreshView();
      
    } catch (error) {
      console.error('Toggle template status error:', error);
      SimpleErrorHandler.showError('Failed to update template status. Please try again.', error);
    }
  }

  /**
   * Handle import templates
   */
  handleImportTemplates() {
    // Create file input for import
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const templates = JSON.parse(text);
        
        if (!Array.isArray(templates)) {
          throw new Error('Invalid file format. Expected array of templates.');
        }
        
        // Import templates
        let imported = 0;
        for (const template of templates) {
          try {
            await taskTemplateManager.createTemplate(template);
            imported++;
          } catch (error) {
            console.warn('Failed to import template:', template.taskName, error);
          }
        }
        
        SimpleErrorHandler.showSuccess(`Successfully imported ${imported} of ${templates.length} templates.`);
        this.refreshView();
        
      } catch (error) {
        console.error('Import error:', error);
        SimpleErrorHandler.showError('Failed to import templates. Please check the file format.', error);
      } finally {
        document.body.removeChild(fileInput);
      }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  /**
   * Handle export templates
   */
  async handleExportTemplates() {
    try {
      const templates = state.getTaskTemplates();
      await this.downloadTemplatesAsJson(templates, 'task-templates-all.json');
      SimpleErrorHandler.showSuccess('Templates exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      SimpleErrorHandler.showError('Failed to export templates. Please try again.', error);
    }
  }

  /**
   * Handle bulk export
   */
  async handleBulkExport(templateIds) {
    try {
      const templates = templateIds.map(id => state.getTaskTemplateById(id)).filter(Boolean);
      await this.downloadTemplatesAsJson(templates, 'task-templates-selected.json');
      SimpleErrorHandler.showSuccess('Selected templates exported successfully!');
    } catch (error) {
      console.error('Bulk export error:', error);
      SimpleErrorHandler.showError('Failed to export selected templates. Please try again.', error);
    }
  }

  // === Utility Methods ===

  /**
   * Refresh the entire view
   */
  refreshView() {
    this.render();
    this.setupEventListeners();
  }

  /**
   * Update bulk actions bar visibility and content
   */
  updateBulkActionsBar() {
    const bulkActionsBar = this.containerElement?.querySelector('#bulk-actions-bar');
    if (bulkActionsBar) {
      const selectedCount = this.selectedTasks.size;
      bulkActionsBar.style.display = selectedCount > 0 ? 'flex' : 'none';
      
      const selectionCount = bulkActionsBar.querySelector('.selection-count');
      if (selectionCount) {
        selectionCount.textContent = `${selectedCount} template${selectedCount !== 1 ? 's' : ''} selected`;
      }
    }
  }

  /**
   * Update task card selection checkboxes
   */
  updateTaskCardSelections() {
    const checkboxes = this.containerElement?.querySelectorAll('.task-checkbox');
    checkboxes?.forEach(checkbox => {
      const templateId = checkbox.dataset.templateId;
      checkbox.checked = this.selectedTasks.has(templateId);
      this.updateTaskCardAppearance(templateId);
    });
  }

  /**
   * Update individual task card appearance based on selection
   */
  updateTaskCardAppearance(templateId) {
    const taskCard = this.containerElement?.querySelector(`.task-card[data-template-id="${templateId}"]`);
    if (taskCard) {
      if (this.selectedTasks.has(templateId)) {
        taskCard.classList.add('selected');
      } else {
        taskCard.classList.remove('selected');
      }
    }
  }

  /**
   * Show bulk action loading state
   */
  showBulkActionLoading(isLoading) {
    const bulkButtons = this.containerElement?.querySelectorAll('.bulk-actions button');
    bulkButtons?.forEach(button => {
      button.disabled = isLoading;
      if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = '⏳ Processing...';
      } else {
        button.textContent = button.dataset.originalText || button.textContent;
      }
    });
  }

  /**
   * Download templates as JSON file
   */
  async downloadTemplatesAsJson(templates, filename) {
    const jsonData = JSON.stringify(templates, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Check if any filters are currently active
   */
  hasActiveFilters() {
    return this.searchQuery || 
           this.currentFilters.priority !== 'all' ||
           this.currentFilters.timeWindow !== 'all' ||
           this.currentFilters.schedulingType !== 'all' ||
           this.currentFilters.isMandatory !== 'all' ||
           this.currentFilters.isActive !== 'all';
  }

  /**
   * Get priority icon for display
   */
  getPriorityIcon(priority) {
    const icons = {
      1: '⚪',
      2: '🔵', 
      3: '🟡',
      4: '🔴',
      5: '🔥'
    };
    return icons[priority] || icons[3];
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category) {
    // If category is already a display name, return as-is
    if (category.includes('Priority') || category.includes('Tasks') || category.includes('Fixed') || 
        category === 'Morning' || category === 'Afternoon' || category === 'Evening' || 
        category === 'Anytime' || category === 'All Templates') {
      return category;
    }
    
    // Otherwise, format it nicely
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
  }

  /**
   * Get human-readable recurrence display
   */
  getRecurrenceDisplay(recurrenceRule) {
    if (!recurrenceRule || recurrenceRule.frequency === 'none') {
      return 'One-time task';
    }
    
    const { frequency, interval } = recurrenceRule;
    
    switch (frequency) {
      case 'daily':
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
      case 'weekly':
        return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      case 'monthly':
        return interval === 1 ? 'Monthly' : `Every ${interval} months`;
      case 'yearly':
        return interval === 1 ? 'Yearly' : `Every ${interval} years`;
      case 'custom':
        return 'Custom pattern';
      default:
        return 'Unknown pattern';
    }
  }

  /**
   * HTML escape utility
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    // Clear event listeners
    this.clearEventListeners();
    
    // Clear timeouts
    this.timeouts.forEach(timeoutId => {
      SafeTimeout.clear(timeoutId);
    });
    this.timeouts = [];
    
    // Remove state change listener
    document.removeEventListener('stateChanged', this.handleTemplateChange);
    
    // Clear container
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
      this.containerElement = null;
    }
    
    // Clear data
    this.selectedTasks.clear();
    
    // Unregister from memory manager
    ComponentManager.unregister(this);
  }
}

// Create and export global instance
export const taskList = new TaskList();

console.log('✅ Task list component initialized');