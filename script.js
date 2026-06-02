const postsContainer = document.getElementById("posts-container");
const statusElement = document.getElementById("status");
const loadMoreBtn = document.getElementById("load-more-btn");
const searchInput = document.getElementById("search-input");

// How many posts to load at one time.
const POSTS_PER_PAGE = 10;

// Wait 500ms after typing before searching.
const SEARCH_DELAY_MS = 500;

// App state values the code needs to remember.
let currentPage = 1;
let isLoading = false;
let hasMorePosts = true;
let totalRenderedPosts = 0;
let currentSearchTerm = "";
let searchTimeoutId = null;

// Shows a message like loading, error, or success.
function setStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.className = "status";

  if (type) {
    statusElement.classList.add(type);
  }
}

// Disables the button while loading and updates its text.
function setButtonState(loading) {
  isLoading = loading;
  loadMoreBtn.disabled = loading || !hasMorePosts;
  loadMoreBtn.textContent = loading ? "Loading..." : "Load More";
}

// Makes text safe before using innerHTML.
function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Makes the search term safe for RegExp.
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlights matching search text inside titles and bodies.
function highlightText(text, searchTerm) {
  const safeText = escapeHtml(text);
  const trimmedSearch = searchTerm.trim();

  // Only highlight when user typed at least 3 letters.
  if (trimmedSearch.length < 3) {
    return safeText;
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmedSearch)})`, "gi");
  return safeText.replace(pattern, "<mark>$1</mark>");
}

// Creates one post card element.
function createPostCard(post, displayNumber) {
  const article = document.createElement("article");
  article.className = "post-card";

  const meta = document.createElement("div");
  meta.className = "post-meta";
  meta.textContent = `Post #${displayNumber}`;

  const title = document.createElement("h2");
  title.className = "post-title";
  title.innerHTML = highlightText(post.title, currentSearchTerm);

  const body = document.createElement("p");
  body.className = "post-body";
  body.innerHTML = highlightText(post.body, currentSearchTerm);

  article.append(meta, title, body);
  return article;
}

// Adds many posts to the page.
function renderPosts(posts) {
  const fragment = document.createDocumentFragment();

  posts.forEach((post, index) => {
    const displayNumber = totalRenderedPosts + index + 1;
    fragment.appendChild(createPostCard(post, displayNumber));
  });

  postsContainer.appendChild(fragment);
  totalRenderedPosts += posts.length;
}

// Shows a message when nothing is found.
function renderEmptyState() {
  postsContainer.innerHTML = `
    <div class="empty-state">
      No posts found.
    </div>
  `;
}

// Resets the list when a new search starts.
function resetPostsState() {
  currentPage = 1;
  hasMorePosts = true;
  totalRenderedPosts = 0;
  postsContainer.innerHTML = "";
  loadMoreBtn.style.display = "inline-block";
}

// Fetches posts from the API using page, limit, and optional search.
async function fetchPosts(page, limit, searchTerm) {
  const url = new URL("https://jsonplaceholder.typicode.com/posts");
  url.searchParams.set("_page", page);
  url.searchParams.set("_limit", limit);

  // Only send search to the API when 3+ letters are typed.
  if (searchTerm.trim().length >= 3) {
    url.searchParams.set("q", searchTerm.trim());
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

// Main function that loads posts and handles states.
async function loadPosts(reset = false) {
  // Prevent duplicate requests.
  if (isLoading) {
    return;
  }

  // Reset list when starting a new search.
  if (reset) {
    resetPostsState();
  }

  // Stop if there are no more posts to load.
  if (!hasMorePosts) {
    return;
  }

  try {
    setButtonState(true);
    setStatus("Loading posts...", "loading");

    const posts = await fetchPosts(currentPage, POSTS_PER_PAGE, currentSearchTerm);

    // No results on first page means empty state.
    if (posts.length === 0 && currentPage === 1) {
      renderEmptyState();
      hasMorePosts = false;
      loadMoreBtn.style.display = "none";
      setStatus("No posts found.");
      return;
    }

    // No results on later pages means everything is loaded.
    if (posts.length === 0) {
      hasMorePosts = false;
      loadMoreBtn.style.display = "none";
      setStatus("All posts loaded.", "success");
      return;
    }

    renderPosts(posts);
    currentPage += 1;

    // Fewer posts than expected usually means last page.
    if (posts.length < POSTS_PER_PAGE) {
      hasMorePosts = false;
      loadMoreBtn.style.display = "none";
      setStatus(
  `Showing ${totalRenderedPosts} ${totalRenderedPosts === 1 ? "post" : "posts"}`,
  "success"
);
      return;
    }

    setStatus(
  `Showing ${totalRenderedPosts} ${totalRenderedPosts === 1 ? "post" : "posts"}`,
  "success"
);
  } catch (error) {
    setStatus("Something went wrong while loading posts.", "error");
    console.error("Failed to load posts:", error);
  } finally {
    setButtonState(false);
  }
}

// Handles typing in the search box with a delay.
function handleSearchInput(event) {
  currentSearchTerm = event.target.value;

  // Cancel previous timer so request is not made on every keystroke.
  clearTimeout(searchTimeoutId);

  searchTimeoutId = setTimeout(() => {
    loadPosts(true);
  }, SEARCH_DELAY_MS);
}

// Loads the next batch when user clicks the button.
loadMoreBtn.addEventListener("click", () => {
  loadPosts(false);
});

// Starts a delayed search when user types.
searchInput.addEventListener("input", handleSearchInput);

// Loads the first batch when the page opens.
loadPosts(true);