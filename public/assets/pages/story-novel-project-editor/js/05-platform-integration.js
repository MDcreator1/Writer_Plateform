let studioPlatformStories = [];
let studioPlatformCoverDataUrl = '';
let studioPlatformBusy = false;
let studioPlatformLaunchTarget = null;

function readStudioPlatformLaunchTarget() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('platformAction') || '';
  const storyId = params.get('platformStoryId') || '';
  const storyTitle = params.get('platformStoryTitle') || '';
  const projectId = params.get('platformProjectId') || '';
  const platformUrl = params.get('platformUrl') || '';
  const chapterId = params.get('platformChapterId') || '';
  if (!['manage-chapters', 'open-studio'].includes(action)) return null;
  return { action, storyId, storyTitle, projectId, platformUrl, chapterId };
}

function clearStudioPlatformLaunchQuery() {
  const url = new URL(window.location.href);
  ['platformAction', 'platformStoryId', 'platformStoryTitle', 'platformProjectId', 'platformUrl', 'platformChapterId'].forEach(key => {
    url.searchParams.delete(key);
  });
  window.history.replaceState({}, '', url.href);
}

function studioPlatformConfig() {
  return {
    apiUrl: '',
    key: ''
  };
}

async function studioPlatformRequest(path, options = {}) {
  const config = studioPlatformConfig();
  const response = await fetch(`${config.apiUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Studio-Integration-Key': config.key,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Writer Platform request failed (${response.status})`);
  return body.data;
}

function studioPlatformEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function studioPlatformModalHtml() {
  return `
    <div class="studio-platform-modal" id="studioPlatformModal" aria-hidden="true">
      <section class="studio-platform-panel" role="dialog" aria-modal="true" aria-labelledby="studioPlatformTitle">
        <header class="studio-platform-head">
          <div>
            <span>Cloud storage</span>
            <h2 id="studioPlatformTitle">Writer Platform Cloud Stories</h2>
          </div>
          <button type="button" class="studio-platform-close" data-studio-platform-action="close" aria-label="Close">?</button>
        </header>
        <div class="studio-platform-scroll">
          <div id="studioPlatformProjectState"></div>
          <section class="studio-platform-available">
            <div class="studio-platform-section-head">
              <div><span>Database workspace</span><h3>Cloud stories</h3></div>
              <button type="button" data-studio-platform-action="refresh-stories">Refresh</button>
            </div>
            <div id="studioPlatformStoryStats" class="studio-platform-cloud-stats"></div>
            <div id="studioPlatformStoryList" class="studio-platform-list"><p>Connect to load cloud stories.</p></div>
          </section>
          <p id="studioPlatformMessage" class="studio-platform-message" role="status"></p>
        </div>
      </section>
    </div>`;
}

function ensureStudioPlatformModal() {
  let modal = document.getElementById('studioPlatformModal');
  if (modal) return modal;
  document.body.insertAdjacentHTML('beforeend', studioPlatformModalHtml());
  modal = document.getElementById('studioPlatformModal');
  modal.addEventListener('mousedown', event => {
    if (event.target === modal) closeStudioPlatformIntegration();
  });
  modal.addEventListener('click', handleStudioPlatformAction);
  return modal;
}

function studioPlatformChapterRows() {
  if (!chapters.length) return '<p class="studio-platform-empty">No published chapters yet. Drafts appear in the Drafts section until you publish them.</p>';
  return chapters.map((chapter, index) => `
    <div class="studio-platform-chapter-row">
      <span><strong>${studioPlatformEscape(chapter.title || `Chapter ${index + 1}`)}</strong><small>Chapter ${index + 1}</small></span>
      <span class="studio-platform-status-label is-published">Published</span>
    </div>`).join('');
}

function studioPlatformProjectStateHtml() {
  if (!hasActiveStory()) {
    return `<section class="studio-platform-current"><h3>No active project</h3><p>Open a local folder project, or open a cloud story below.</p></section>`;
  }

  const manifest = normalizeProjectManifest(projectManifest || createProjectManifest());
  const integration = manifest.integration;
  if (integration.mode !== 'managed') {
    return `
      <section class="studio-platform-current">
        <div class="studio-platform-section-head">
          <div><span>Local folder project</span><h3>${studioPlatformEscape(manifest.title)}</h3></div>
          <span class="studio-platform-badge is-local">Local only</span>
        </div>
        <p>This project is stored in the selected local folder. Save it as a cloud draft or publish it to create a database-backed cloud workspace.</p>
        <div class="studio-platform-actions studio-platform-actions-left">
          <button type="button" data-studio-platform-action="create-cloud-draft">Save as Cloud Draft</button>
          <button type="button" class="studio-platform-primary" data-studio-platform-action="show-publish">Publish Project</button>
        </div>
        <form id="studioPlatformPublishForm" class="studio-platform-wizard" hidden>
          <h4>Publishing Wizard</h4>
          <div class="studio-platform-grid">
            <label><span>Title</span><input name="title" maxlength="70" required value="${studioPlatformEscape(manifest.title)}"></label>
            <label><span>Slug</span><input name="slug" maxlength="100" placeholder="generated-from-title"></label>
            <label class="wide"><span>Cover</span><input name="cover" type="file" accept="image/*"></label>
            <label class="wide"><span>Summary</span><textarea name="summary" rows="4" minlength="20" maxlength="1200" required>${studioPlatformEscape(manifest.synopsis || '')}</textarea></label>
            <label><span>Genres (comma separated)</span><input name="genres" required placeholder="Fantasy, Romance"></label>
            <label><span>Tags (comma separated)</span><input name="tags" placeholder="slow burn, mystery"></label>
            <label><span>SEO title</span><input name="seoTitle" maxlength="70"></label>
            <label><span>SEO description</span><input name="seoDescription" maxlength="170"></label>
            <label><span>Story price (cents)</span><input name="priceCents" type="number" min="0" step="1" value="0"></label>
            <label><span>Default chapter coins</span><input name="defaultChapterCoinPrice" type="number" min="0" step="1" value="0"></label>
          </div>
          <div class="studio-platform-actions">
            <button type="button" data-studio-platform-action="cancel-publish">Cancel</button>
            <button type="submit" class="studio-platform-primary">Create published cloud story</button>
          </div>
        </form>
      </section>`;
  }

  return `
    <section class="studio-platform-current">
      <div class="studio-platform-section-head">
        <div><span>${integration.published === false ? 'Cloud draft story' : 'Cloud published story'}</span><h3>${studioPlatformEscape(manifest.title)}</h3></div>
        <span class="studio-platform-badge">Cloud mode</span>
      </div>
      <p class="studio-platform-story-id">Story ID: <code>${studioPlatformEscape(integration.storyId)}</code></p>
      <p>Metadata remains owned by Writer Platform. Chapters, drafts, naming, facts, notes and editor files are stored here as cloud Studio files.</p>
      <div class="studio-platform-cloud-summary">
        <span>${chapters.length} published chapters</span>
        <span>${chapterDrafts.length} drafts</span>
        <span>${chapterTrashDrafts.length} trash</span>
      </div>
      <div class="studio-platform-chapters">
        <h4>Published chapters</h4>
        ${studioPlatformChapterRows()}
      </div>
    </section>`;
}

function renderStudioPlatformProjectState() {
  const container = document.getElementById('studioPlatformProjectState');
  if (!container) return;
  container.innerHTML = studioPlatformProjectStateHtml();
  const form = document.getElementById('studioPlatformPublishForm');
  if (form) form.addEventListener('submit', publishStudioProject);
}

function renderStudioPlatformStories() {
  const list = document.getElementById('studioPlatformStoryList');
  const stats = document.getElementById('studioPlatformStoryStats');
  if (!list) return;
  const publishedCount = studioPlatformStories.filter(story => story.published).length;
  const draftCount = studioPlatformStories.length - publishedCount;
  if (stats) {
    stats.innerHTML = studioPlatformStories.length
      ? `<span>${studioPlatformStories.length} total</span><span>${publishedCount} published</span><span>${draftCount} unpublished</span>`
      : '';
  }
  if (!studioPlatformStories.length) {
    list.innerHTML = '<p class="studio-platform-empty">No cloud stories are currently available.</p>';
    return;
  }
  const targetStoryId = studioPlatformLaunchTarget?.storyId || '';
  const orderedStories = [...studioPlatformStories].sort((left, right) => {
    if (left.storyId === targetStoryId) return -1;
    if (right.storyId === targetStoryId) return 1;
    if (left.published !== right.published) return left.published ? -1 : 1;
    return String(left.storyTitle || '').localeCompare(String(right.storyTitle || ''));
  });
  list.innerHTML = orderedStories.map(story => {
    const isTarget = Boolean(targetStoryId && story.storyId === targetStoryId);
    const label = story.published ? 'Published' : 'Unpublished draft';
    const fileCount = Number(story.cloudFileCount) || 0;
    return `
      <article class="studio-platform-story-row ${isTarget ? 'is-launch-target' : ''}">
        <div><strong>${studioPlatformEscape(story.storyTitle)}</strong><code>${studioPlatformEscape(story.storyId)}</code><small>${label} ? ${fileCount} Studio files</small></div>
        <button type="button" data-studio-platform-action="open-cloud-story" data-story-id="${studioPlatformEscape(story.storyId)}">
          Open cloud story
        </button>
      </article>`;
  }).join('');
}

async function refreshStudioPlatformStories() {
  studioPlatformSetBusy(true);
  studioPlatformSetMessage('Loading cloud stories...');
  try {
    studioPlatformStories = await studioPlatformRequest('/api/studio/projects');
    renderStudioPlatformStories();
    studioPlatformSetMessage('Cloud stories loaded.');
  } catch (error) {
    studioPlatformSetMessage(error instanceof Error ? error.message : 'Unable to load cloud stories.', true);
  } finally {
    studioPlatformSetBusy(false);
  }
}

function commaList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function readStudioCover(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Cover could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function collectStudioWorkspaceFiles() {
  await saveCurrentProject();
  const paths = new Set([
    PROJECT_MANIFEST_FILE,
    PROJECT_NAMING_FILE,
    PROJECT_DRAFTS_FILE,
    PROJECT_TRASH_DRAFTS_FILE,
    PROJECT_CHAPTER_EDIT_DRAFTS_FILE
  ]);
  chapters.forEach((chapter, index) => paths.add(chapter.contentPath || chapterFilePath(index)));
  chapterDrafts.forEach((draft, index) => paths.add(draft.contentPath || draftFilePath(index)));
  chapterTrashDrafts.forEach((draft, index) => paths.add(draft.contentPath || trashDraftFilePath(index)));
  Object.values(chapterEditDrafts || {}).forEach((draft, index) => paths.add(draft.contentPath || chapterEditDraftFilePath(index)));

  const files = [];
  for (const path of paths) {
    if (!path) continue;
    try {
      const fileHandle = await getProjectFileHandle(path);
      files.push({ path, content: await readFileText(fileHandle) });
    } catch (error) {
      if (error?.name !== 'NotFoundError') console.warn('Studio workspace file read failed:', path, error);
    }
  }
  return files;
}

async function openCloudStoryByProject(projectId, options = {}) {
  if (!projectId) return false;
  localStorage.setItem('lm_virtual_mode', 'true');
  localStorage.setItem('lm_virtual_project_id', projectId);
  workspaceDirectoryHandle = new VirtualDirectoryHandle(null, '');
  const projectHandle = new VirtualDirectoryHandle(projectId, '');
  const manifest = await readProjectManifestFromDirectory(projectHandle);
  const typeFolderName = projectTypeFolderName(manifest.type || 'novel');
  await loadLocalProject(projectHandle, true, { typeFolderName });
  if (typeof refreshProjectUI === 'function') refreshProjectUI();
  renderStudioPlatformProjectState();

  const chapterId = options.chapterId || '';
  if (chapterId) {
    if (typeof ensureChapters === 'function') ensureChapters();
    const publishedIndex = chapters.findIndex(item => String(item.id || item.contentPath) === String(chapterId));
    const draftIndex = chapterDrafts.findIndex(item => String(item.id || item.contentPath) === String(chapterId));
    const trashIndex = chapterTrashDrafts.findIndex(item => String(item.id || item.contentPath) === String(chapterId));
    if (publishedIndex >= 0 && typeof switchChap === 'function') {
      activeEditorMode = 'chapter';
      if (curChap === publishedIndex) curChap = -1;
      await switchChap(publishedIndex);
    } else if (draftIndex >= 0 && typeof switchDraft === 'function') {
      activeEditorMode = 'draft';
      if (curDraft === draftIndex) curDraft = -1;
      await switchDraft(draftIndex);
    } else if (trashIndex >= 0 && typeof setDraftTrashMode === 'function') {
      setDraftTrashMode(true);
      if (typeof switchTrashDraft === 'function') switchTrashDraft(trashIndex);
    }
  }
  return true;
}

async function ensureCloudProjectForStory(story) {
  if (story?.linkedProjectId || story?.projectId) return story.linkedProjectId || story.projectId;
  const linked = await studioPlatformRequest('/api/studio/projects', {
    method: 'POST',
    body: JSON.stringify({
      storyId: story.storyId,
      projectId: `platform-${story.storyId}`,
      projectTitle: story.storyTitle
    })
  });
  return linked.projectId;
}

async function openStudioPlatformStory(storyId, options = {}) {
  const story = studioPlatformStories.find(item => item.storyId === storyId) || {
    storyId,
    storyTitle: studioPlatformLaunchTarget?.storyTitle || '',
    linkedProjectId: studioPlatformLaunchTarget?.projectId || ''
  };
  studioPlatformSetBusy(true);
  studioPlatformSetMessage('Opening cloud workspace...');
  try {
    const projectId = await ensureCloudProjectForStory(story);
    await openCloudStoryByProject(projectId, { chapterId: options.chapterId || studioPlatformLaunchTarget?.chapterId || '' });
    clearStudioPlatformLaunchQuery();
    closeStudioPlatformIntegration();
    studioPlatformSetMessage(`Opened ${story.storyTitle || 'cloud story'}.`);
    return true;
  } catch (error) {
    studioPlatformSetMessage(error instanceof Error ? error.message : 'Cloud story could not be opened.', true);
    return false;
  } finally {
    studioPlatformSetBusy(false);
  }
}

async function createCloudDraftFromCurrentProject() {
  if (!hasActiveStory() || isManagedPlatformProject()) return;
  studioPlatformSetBusy(true);
  studioPlatformSetMessage('Saving local project as cloud draft...');
  try {
    const manifest = normalizeProjectManifest(projectManifest || createProjectManifest());
    const result = await studioPlatformRequest('/api/studio/projects/create-draft', {
      method: 'POST',
      body: JSON.stringify({
        projectId: manifest.integration.projectId,
        title: manifest.title || 'Untitled Story',
        author: manifest.author || 'Writing Studio',
        type: manifest.type || 'novel',
        language: manifest.language || 'en',
        synopsis: manifest.synopsis || '',
        workspaceFiles: await collectStudioWorkspaceFiles()
      })
    });
    await openCloudStoryByProject(result.projectId);
    await refreshStudioPlatformStories();
    studioPlatformSetMessage('Cloud draft created. You are now editing the database-backed cloud copy.');
  } catch (error) {
    studioPlatformSetMessage(error instanceof Error ? error.message : 'Cloud draft creation failed.', true);
  } finally {
    studioPlatformSetBusy(false);
  }
}

async function publishStudioProject(event) {
  event.preventDefault();
  if (!hasActiveStory() || isManagedPlatformProject()) return;
  const form = event.currentTarget;
  studioPlatformSetBusy(true);
  studioPlatformSetMessage('Creating the published cloud story...');
  try {
    const data = new FormData(form);
    studioPlatformCoverDataUrl = await readStudioCover(data.get('cover'));
    const manifest = normalizeProjectManifest(projectManifest || createProjectManifest());
    const result = await studioPlatformRequest('/api/studio/publish', {
      method: 'POST',
      body: JSON.stringify({
        projectId: manifest.integration.projectId,
        title: String(data.get('title') || '').trim(),
        cover: studioPlatformCoverDataUrl,
        summary: String(data.get('summary') || '').trim(),
        genres: commaList(data.get('genres')),
        tags: commaList(data.get('tags')),
        slug: String(data.get('slug') || '').trim(),
        seoTitle: String(data.get('seoTitle') || '').trim(),
        seoDescription: String(data.get('seoDescription') || '').trim(),
        priceCents: Number(data.get('priceCents')) || 0,
        defaultChapterCoinPrice: Number(data.get('defaultChapterCoinPrice')) || 0,
        workspaceFiles: await collectStudioWorkspaceFiles()
      })
    });
    await openCloudStoryByProject(result.projectId);
    await refreshStudioPlatformStories();
    studioPlatformSetMessage('Project published. You are now editing the database-backed cloud copy.');
  } catch (error) {
    studioPlatformSetMessage(error instanceof Error ? error.message : 'Project publishing failed.', true);
  } finally {
    studioPlatformSetBusy(false);
  }
}

async function handleStudioPlatformAction(event) {
  const button = event.target.closest('[data-studio-platform-action]');
  if (!button || studioPlatformBusy && button.dataset.studioPlatformAction !== 'close') return;
  const action = button.dataset.studioPlatformAction;
  if (action === 'close') closeStudioPlatformIntegration();
  if (action === 'refresh-stories') await refreshStudioPlatformStories();
  if (action === 'open-cloud-story') await openStudioPlatformStory(button.dataset.storyId || '');
  if (action === 'show-publish') document.getElementById('studioPlatformPublishForm').hidden = false;
  if (action === 'cancel-publish') document.getElementById('studioPlatformPublishForm').hidden = true;
  if (action === 'create-cloud-draft') await createCloudDraftFromCurrentProject();
}

function openStudioPlatformIntegration() {
  const modal = ensureStudioPlatformModal();
  renderStudioPlatformProjectState();
  renderStudioPlatformStories();
  modal.classList.add('is-visible');
  modal.setAttribute('aria-hidden', 'false');
  void refreshStudioPlatformStories();
}

function closeStudioPlatformIntegration() {
  const modal = document.getElementById('studioPlatformModal');
  modal?.classList.remove('is-visible');
  modal?.setAttribute('aria-hidden', 'true');
}

async function autoResolveStudioLaunchTarget() {
  if (!studioPlatformLaunchTarget) return;
  if (typeof showAppLoader === 'function') showAppLoader('Opening cloud story...');
  try {
    studioPlatformStories = await studioPlatformRequest('/api/studio/projects');
    const target = studioPlatformLaunchTarget;
    const story = studioPlatformStories.find(item => item.storyId === target.storyId) || {
      storyId: target.storyId,
      storyTitle: target.storyTitle,
      linkedProjectId: target.projectId
    };
    const projectId = target.projectId || await ensureCloudProjectForStory(story);
    await openCloudStoryByProject(projectId, { chapterId: target.chapterId });
    clearStudioPlatformLaunchQuery();
    if (typeof hideAppLoader === 'function') hideAppLoader(true);
  } catch (error) {
    console.warn('Cloud launch target resolution failed:', error);
    if (typeof hideAppLoader === 'function') hideAppLoader(true);
    openStudioPlatformIntegration();
    studioPlatformSetMessage(error.message || 'Connection to platform failed.', true);
  }
}

function initStudioPlatformIntegration() {
  studioPlatformLaunchTarget = readStudioPlatformLaunchTarget();
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('platformIntegrationBtn')) return;
  const button = document.createElement('button');
  button.id = 'platformIntegrationBtn';
  button.type = 'button';
  button.className = 'studio-platform-topbar-btn';
  button.textContent = 'Platform';
  button.title = 'Return to Writer Platform Admin Dashboard';
  button.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('platformStoryId') || '';
    if (storyId) {
      window.location.href = `/admin/stories/${storyId}`;
    } else {
      window.location.href = '/admin';
    }
  });
  const themeButton = document.getElementById('darkBtn');
  actions.insertBefore(button, themeButton || null);
  ensureStudioPlatformModal();
  if (studioPlatformLaunchTarget) {
    const checkInit = () => {
      if (window.isEditorInitialized) autoResolveStudioLaunchTarget();
      else window.setTimeout(checkInit, 50);
    };
    checkInit();
  }
}

window.openStudioPlatformIntegration = openStudioPlatformIntegration;
window.closeStudioPlatformIntegration = closeStudioPlatformIntegration;
window.studioPlatformRequest = studioPlatformRequest;

document.addEventListener('DOMContentLoaded', initStudioPlatformIntegration);
