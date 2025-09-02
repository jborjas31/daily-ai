/**
 * TaskModalContainer (V2 skeleton)
 * Phase 0 — Bootstrap & Flag
 *
 * This minimal container exposes no-op APIs so it can be safely
 * imported and wired behind a feature flag without behavior changes.
 */
import { state } from '../state.js';
import { SimpleErrorHandler } from '../utils/SimpleErrorHandler.js';
import { TemplateBasicsSection } from './taskModal/TemplateBasicsSection.js';
import { SchedulingSection } from './taskModal/SchedulingSection.js';
import { RecurrenceSection } from './taskModal/RecurrenceSection.js';
import { DependenciesSection } from './taskModal/DependenciesSection.js';
import { PreviewSection } from './taskModal/PreviewSection.js';
import { ActionsFooter } from './taskModal/ActionsFooter.js';
import { FocusTrap } from '../features/FocusTrap.js';
import { DirtyStateGuard } from '../features/DirtyStateGuard.js';
import { KeyboardShortcuts } from '../features/KeyboardShortcuts.js';
import { AutosaveDraft } from '../features/AutosaveDraft.js';
import { TaskTemplateFormService } from '../logic/TaskTemplateFormService.js';
import { TaskTemplateValidation } from '../logic/TaskTemplateValidation.js';

export class TaskModalContainer {
  constructor() {
    this._isOpen = false;
    this._onSave = null;
    // Simple event dispatch target; using window for now
    this._eventTarget = window;

    // DOM refs
    this._overlayEl = null;
    this._dialogEl = null;
    this._bodyEl = null;
    this._footerEl = null;
    this._titleEl = null;

    // Focus restore
    this._openerEl = null;
    this._lastFocusedEl = null;
    this._mode = 'create';
    this._formModel = null;
    this._isDirty = false;
    this._saving = false;
    this._boundSectionHandler = null;
    // Frame batching
    this._rafId = null;
    this._needs = { reconcile: false, validate: false, footer: false };
  }

  /**
   * Open in create mode (skeleton)
   * @param {object} initialData
   * @param {Function} onSave
   */
  showCreate(initialData = {}, onSave = () => {}) {
    console.log('[TaskModalContainer] showCreate (skeleton)', { initialData });
    this._mode = 'create';
    this._openShell('Create Task Template');
    this._isOpen = true;
    this._onSave = onSave;
    // Hydrate form model for create
    try {
      this._formModel = TaskTemplateFormService.toFormModel(initialData);
      console.log('[TaskModalContainer] initial form model (create)', this._formModel);
    } catch (e) {
      console.error('[TaskModalContainer] failed to hydrate create form model', e);
      SimpleErrorHandler.showError('Failed to prepare form for creating a task.', e);
      this._formModel = TaskTemplateFormService.toFormModel({});
    }
    // Autosave: compute key and attempt restore
    try {
      this._draftKey = this._computeDraftKey('new');
      this._autosave = new AutosaveDraft({ key: this._draftKey });
      const restored = this._autosave.load();
      if (restored && typeof restored === 'object') {
        this._formModel = { ...this._formModel, ...restored };
        console.log('[TaskModalContainer] draft restored (create)', this._formModel);
      }
    } catch (e) {
      console.warn('[TaskModalContainer] autosave restore failed', e);
    }
    this._isDirty = false;
    this._dirtyGuard = new DirtyStateGuard({
      baseline: this._formModel,
      onChange: (dirty) => {
        this._isDirty = dirty;
        this.emitDirtyChange(dirty);
        this._renderFooterActions();
      }
    });
    this._renderFooterActions();
    this._dispatch('open', { mode: 'create', initialData });
  }

  /**
   * Open in edit mode (skeleton)
   * @param {object} template
   * @param {Function} onSave
   */
  showEdit(template = {}, onSave = () => {}) {
    console.log('[TaskModalContainer] showEdit (skeleton)', { template });
    this._mode = 'edit';
    this._openShell('Edit Task Template');
    this._isOpen = true;
    this._onSave = onSave;
    // Hydrate form model for edit
    try {
      this._formModel = TaskTemplateFormService.toFormModel(template);
      console.log('[TaskModalContainer] initial form model (edit)', this._formModel);
    } catch (e) {
      console.error('[TaskModalContainer] failed to hydrate edit form model', e);
      SimpleErrorHandler.showError('Failed to load task for editing.', e);
      this._formModel = TaskTemplateFormService.toFormModel({});
    }
    // Autosave: compute key and attempt restore
    try {
      const keyId = template?.id || this._formModel?.id || 'unknown';
      this._draftKey = this._computeDraftKey(keyId);
      this._autosave = new AutosaveDraft({ key: this._draftKey });
      const restored = this._autosave.load();
      if (restored && typeof restored === 'object') {
        this._formModel = { ...this._formModel, ...restored };
        console.log('[TaskModalContainer] draft restored (edit)', this._formModel);
      }
    } catch (e) {
      console.warn('[TaskModalContainer] autosave restore failed', e);
    }
    this._isDirty = false;
    this._dirtyGuard = new DirtyStateGuard({
      baseline: this._formModel,
      onChange: (dirty) => {
        this._isDirty = dirty;
        this.emitDirtyChange(dirty);
        this._renderFooterActions();
      }
    });
    this._renderFooterActions();
    this._dispatch('open', { mode: 'edit', template });
  }

  /**
   * Close the modal (skeleton)
   */
  close() {
    console.log('[TaskModalContainer] close (skeleton)');
    if (this._isDirty) {
      const ok = window.confirm('You have unsaved changes. Discard them?');
      if (!ok) return;
    }
    this._isOpen = false;
    this._dispatch('close', {});
    this._removeShell();
    // Restore focus
    try {
      if (this._openerEl && typeof this._openerEl.focus === 'function') {
        this._openerEl.focus();
      } else if (this._lastFocusedEl && typeof this._lastFocusedEl.focus === 'function') {
        this._lastFocusedEl.focus();
      }
    } catch (e) {
      // noop
    }
    this._openerEl = null;
    this._lastFocusedEl = null;
  }

  // ========== Event Contract (Phase 1 stubs) ==========

  /**
   * Emit a section change patch from a presentational section
   * @param {object} patch Minimal diff of form model
   */
  emitSectionChange(patch = {}) {
    console.log('[TaskModalContainer] emit section-change', patch);
    this._dispatch('section-change', { patch });
  }

  /**
   * Request full validation across sections
   */
  requestValidation() {
    console.log('[TaskModalContainer] dispatch validate-request');
    this._dispatch('validate-request', {});
  }

  /**
   * Emit dirty state change
   * @param {boolean} isDirty
   */
  emitDirtyChange(isDirty) {
    console.log('[TaskModalContainer] emit dirty-change', { isDirty });
    this._dispatch('dirty-change', { isDirty });
  }

  /**
   * Request submit (save) action
   */
  requestSubmit() {
    console.log('[TaskModalContainer] dispatch submit-request');
    this._dispatch('submit-request', {});
  }

  /**
   * Convenience: subscribe to container events (window-level)
   */
  on(type, handler) {
    this._eventTarget.addEventListener(type, handler);
  }

  /**
   * Convenience: unsubscribe from container events
   */
  off(type, handler) {
    this._eventTarget.removeEventListener(type, handler);
  }

  /**
   * Internal dispatch helper
   */
  _dispatch(type, detail) {
    try {
      const evt = new CustomEvent(type, { detail });
      this._eventTarget.dispatchEvent(evt);
    } catch (e) {
      console.warn('[TaskModalContainer] Event dispatch failed', type, e);
    }
  }

  // ========== Internal: Shell Rendering ==========

  _openShell(titleText = 'Task Template') {
    // If already open, close first
    if (this._overlayEl) {
      this._removeShell();
    }

    this._openerEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this._lastFocusedEl = this._openerEl;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    // Dialog
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h2');
    title.textContent = titleText;
    title.id = 'taskmodal-v2-title';
    dialog.setAttribute('aria-labelledby', title.id);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = '';
    const basicsMount = document.createElement('div');
    basicsMount.id = 'tmv2-basics-section';
    body.appendChild(basicsMount);

    const schedulingMount = document.createElement('div');
    schedulingMount.id = 'tmv2-scheduling-section';
    body.appendChild(schedulingMount);

    const recurrenceMount = document.createElement('div');
    recurrenceMount.id = 'tmv2-recurrence-section';
    body.appendChild(recurrenceMount);

    const depsMount = document.createElement('div');
    depsMount.id = 'tmv2-dependencies-section';
    body.appendChild(depsMount);

    const previewMount = document.createElement('div');
    previewMount.id = 'tmv2-preview-section';
    body.appendChild(previewMount);
    this._mounts = {
      basics: basicsMount,
      scheduling: schedulingMount,
      recurrence: recurrenceMount,
      deps: depsMount,
      preview: previewMount
    };

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });

    // Keyboard: Esc to close
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    };
    document.addEventListener('keydown', keyHandler, { once: true });

    // Listen for section-change events to mark dirty and merge patches
    this._boundSectionHandler = (e) => {
      const patch = (e && e.detail && e.detail.patch) || {};
      this.updateForm(patch);
    };
    window.addEventListener('section-change', this._boundSectionHandler);

    // Listen for submit-request to trigger save
    this._boundSubmitHandler = () => {
      const saveBtn = this._footerEl?.querySelector('[data-role="save"]') || null;
      this._handleSave(saveBtn);
    };
    window.addEventListener('submit-request', this._boundSubmitHandler);

    // Listen for validate-request to recompute validation
    this._boundValidateHandler = () => this._updateValidation();
    window.addEventListener('validate-request', this._boundValidateHandler);

    // Mount
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Save refs
    this._overlayEl = overlay;
    this._dialogEl = dialog;
    this._bodyEl = body;
    this._footerEl = footer;
    this._titleEl = title;

    // Focus the dialog
    setTimeout(() => {
      try {
        dialog.tabIndex = -1;
        dialog.focus();
      } catch (e) {}
    }, 0);

    // Activate focus trap and hide background from SR
    try {
      this._focusTrap = new FocusTrap(dialog, { overlayEl: overlay });
      this._focusTrap.activate();
    } catch (e) {
      console.warn('[TaskModalContainer] FocusTrap activation failed', e);
    }

    // Enable keyboard shortcuts (Cmd/Ctrl+S submit)
    try {
      this._kb = new KeyboardShortcuts(this, { scopeEl: dialog });
      this._kb.activate();
    } catch (e) {
      console.warn('[TaskModalContainer] KeyboardShortcuts activation failed', e);
    }

    // Render sections with current form model
    try {
      const model = this._formModel || TaskTemplateFormService.toFormModel({});
      this._sections = {};
      this._sections.basics = new TemplateBasicsSection(this);
      this._sections.basics.render(basicsMount, model);

      this._sections.scheduling = new SchedulingSection(this);
      this._sections.scheduling.render(schedulingMount, model);

      this._sections.recurrence = new RecurrenceSection(this);
      this._sections.recurrence.render(recurrenceMount, model);

      this._sections.deps = new DependenciesSection(this);
      this._sections.deps.render(depsMount, model);

      this._previewSection = new PreviewSection(this);
      this._previewSection.render(previewMount);

      // Initialize reconciliation keys and validation state
      this._sectionKeys = this._computeSectionKeys(model);
      this._updateValidation();
    } catch (e) {
      console.warn('[TaskModalContainer] failed to render sections', e);
    }
  }

  _removeShell() {
    if (this._overlayEl && this._overlayEl.parentNode) {
      this._overlayEl.parentNode.removeChild(this._overlayEl);
    }
    if (this._rafId != null) {
      try { (window.cancelAnimationFrame || window.clearTimeout)(this._rafId); } catch (_) {}
      this._rafId = null;
    }
    if (this._boundSectionHandler) {
      window.removeEventListener('section-change', this._boundSectionHandler);
      this._boundSectionHandler = null;
    }
    if (this._boundSubmitHandler) {
      window.removeEventListener('submit-request', this._boundSubmitHandler);
      this._boundSubmitHandler = null;
    }
    if (this._previewSection && typeof this._previewSection.dispose === 'function') {
      try { this._previewSection.dispose(); } catch (_) {}
      this._previewSection = null;
    }
    if (this._focusTrap && typeof this._focusTrap.deactivate === 'function') {
      try { this._focusTrap.deactivate(); } catch (_) {}
      this._focusTrap = null;
    }
    if (this._kb && typeof this._kb.deactivate === 'function') {
      try { this._kb.deactivate(); } catch (_) {}
      this._kb = null;
    }
    if (this._boundValidateHandler) {
      window.removeEventListener('validate-request', this._boundValidateHandler);
      this._boundValidateHandler = null;
    }
    this._overlayEl = null;
    this._dialogEl = null;
    this._bodyEl = null;
    this._footerEl = null;
    this._titleEl = null;
  }

  // ========== Footer Actions & Flows ==========

  _renderFooterActions() {
    if (!this._footerEl) return;
    const hasId = !!(this._formModel && this._formModel.id);
    const footer = new ActionsFooter(this);
    footer.render(this._footerEl, {
      mode: this._mode,
      isDirty: this._isDirty,
      isValid: !!(this._validation ? this._validation.isValid : true),
      hasId
    });
  }

  async _handleSave(saveBtn = null) {
    if (this._saving) return;
    try {
      // Validate before saving
      this._updateValidation();
      if (this._validation && !this._validation.isValid) {
        this._focusFirstInvalid();
        return;
      }

      this._saving = true;
      const original = saveBtn?.textContent;
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = this._mode === 'edit' ? 'Saving...' : 'Creating...';
      }

      let result;
      if (this._mode === 'edit' && this._formModel?.id) {
        result = await state.updateTaskTemplate(this._formModel.id, this._formModel);
      } else {
        result = await state.createTaskTemplate(this._formModel);
      }

      SimpleErrorHandler.showSuccess(this._mode === 'edit' ? 'Template updated!' : 'Template created!');
      if (typeof this._onSave === 'function') this._onSave(result);
      this._isDirty = false;
      if (this._autosave) {
        try { this._autosave.clear(); } catch (_) {}
      }
      if (this._dirtyGuard) this._dirtyGuard.setBaseline(this._formModel);
      this.close();
    } catch (e) {
      console.error('[TaskModalContainer] save failed', e);
      SimpleErrorHandler.showError('Failed to save template.', e);
    } finally {
      this._saving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = this._mode === 'edit' ? 'Save Changes' : 'Create Template';
      }
    }
  }

  async _handleDelete(deleteBtn) {
    if (!this._formModel?.id) return;
    const ok = window.confirm('Delete this template? This cannot be undone.');
    if (!ok) return;
    try {
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting...';
      await state.deleteTaskTemplate(this._formModel.id);
      SimpleErrorHandler.showSuccess('Template deleted.');
      this._isDirty = false;
      this.close();
    } catch (e) {
      console.error('[TaskModalContainer] delete failed', e);
      SimpleErrorHandler.showError('Failed to delete template.', e);
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'Delete';
    }
  }

  // Public helper to update form model and mark dirty
  updateForm(patch) {
    this._formModel = { ...(this._formModel || TaskTemplateFormService.toFormModel({})), ...patch };
    if (this._dirtyGuard) this._dirtyGuard.setCurrent(this._formModel);
    if (this._autosave) this._autosave.update(this._formModel);
    // Batch DOM updates to next animation frame
    this._needs.reconcile = true;
    this._needs.validate = true;
    this._needs.footer = true;
    this._requestFrame();
  }

  _updateValidation() {
    if (!this._formModel) return;
    try {
      this._validation = TaskTemplateValidation.validateForm(this._formModel);
      this._applyValidationToSections();
    } catch (e) {
      console.warn('[TaskModalContainer] validation failed', e);
      this._validation = { isValid: true, errorsByField: new Map(), warningsByField: new Map() };
    }
    this._renderFooterActions();
  }

  _applyValidationToSections() {
    if (!this._validation) return;
    const get = (key) => this._validation.errorsByField.get(key) || [];
    // Basics
    this._setError('tmv2-task-name-error', get('taskName'));
    this._setError('tmv2-task-desc-error', get('description'));
    this._setError('tmv2-task-category-error', get('category'));
    this._setError('tmv2-priority-error', get('priority'));
    // Scheduling
    this._setError('tmv2-default-time-error', get('defaultTime'));
    this._setError('tmv2-time-window-error', get('timeWindow'));
    // Recurrence
    this._setError('tmv2-recur-frequency-error', get('recurrence.frequency'));
    this._setError('tmv2-recur-interval-error', get('recurrence.interval'));
    this._setError('tmv2-recur-days-error', get('recurrence.daysOfWeek'));
    this._setError('tmv2-recur-end-date-error', get('recurrence.endDate'));
    this._setError('tmv2-recur-end-after-error', get('recurrence.endAfterOccurrences'));
    // Dependencies
    this._setError('tmv2-dep-error', get('dependsOn'));
  }

  _setError(elementId, messages) {
    const el = this._dialogEl?.querySelector(`#${elementId}`);
    if (!el) return;
    const msg = (messages && messages.length) ? messages[0] : '';
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  _focusFirstInvalid() {
    if (!this._validation || this._validation.isValid) return;
    const order = [
      ['taskName', '#tmv2-task-name'],
      ['description', '#tmv2-task-desc'],
      ['category', '#tmv2-task-category'],
      ['priority', '#tmv2-priority'],
      ['defaultTime', '#tmv2-default-time'],
      ['timeWindow', '#tmv2-time-window'],
      ['recurrence.frequency', '#tmv2-recur-frequency'],
      ['recurrence.interval', '#tmv2-recur-interval'],
      ['recurrence.daysOfWeek', '#tmv2-recur-weekly .tmv2-weekday'],
      ['recurrence.endDate', '#tmv2-recur-end-date'],
      ['recurrence.endAfterOccurrences', '#tmv2-recur-end-after'],
      ['dependsOn', '#tmv2-dep-select']
    ];
    for (const [key, selector] of order) {
      if (this._validation.errorsByField.get(key)?.length) {
        const el = this._dialogEl?.querySelector(selector);
        if (el && typeof el.focus === 'function') {
          try { el.focus(); } catch (_) {}
        }
        break;
      }
    }
  }

  _requestFrame() {
    if (this._rafId != null) return;
    this._rafId = (window.requestAnimationFrame || window.setTimeout)(() => this._flushFrame());
  }

  _flushFrame() {
    this._rafId = null;
    const tasks = { ...this._needs };
    this._needs = { reconcile: false, validate: false, footer: false };
    try {
      if (tasks.reconcile) this._reconcileSections();
      if (tasks.validate) this._updateValidation();
      else if (tasks.footer) this._renderFooterActions();
    } catch (e) {
      console.warn('[TaskModalContainer] frame flush error', e);
    }
  }

  _computeSectionKeys(model) {
    const m = model || {};
    return {
      scheduling: String(m.schedulingType || 'flexible'),
      recurrence: String((m.recurrenceRule && m.recurrenceRule.frequency) || 'none'),
      deps: Array.isArray(m.dependsOn) ? m.dependsOn.join('|') : ''
      // Basics intentionally omitted to avoid flicker during typing
    };
  }

  _reconcileSections() {
    if (!this._sections || !this._mounts) return;
    const prev = this._sectionKeys || {};
    const next = this._computeSectionKeys(this._formModel);
    if (prev.scheduling !== next.scheduling && this._sections.scheduling) {
      try { this._sections.scheduling.render(this._mounts.scheduling, this._formModel); } catch (_) {}
    }
    if (prev.recurrence !== next.recurrence && this._sections.recurrence) {
      try { this._sections.recurrence.render(this._mounts.recurrence, this._formModel); } catch (_) {}
    }
    if (prev.deps !== next.deps && this._sections.deps) {
      try { this._sections.deps.render(this._mounts.deps, this._formModel); } catch (_) {}
    }
    this._sectionKeys = next;
  }

  _computeDraftKey(idPart) {
    const uid = (state.getUser && state.getUser()?.uid) || 'anon';
    const part = String(idPart || 'new');
    return `tmv2_draft_${uid}_${part}`;
  }

  // ========== Internal: Form Model Hydration ==========

  // Legacy hydration helpers removed in favor of TaskTemplateFormService
}
