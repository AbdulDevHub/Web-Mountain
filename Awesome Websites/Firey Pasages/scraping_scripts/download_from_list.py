import os
import re
import time
import requests
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

LIST_FILE = "stories.txt"
OUTPUT_DIR = "Downloaded_Stories"

def sanitize_filename(name):
    """Remove illegal filesystem characters."""
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def clean_text(text):
    """Clean up raw carriage returns and string escapes from JavaScript/JSON payloads."""
    if not text:
        return ""
    text = text.replace('\\r\\n', '\n').replace('\r\n', '\n').replace('\r', '\n')
    text = text.replace('\\n', '\n').replace('\\t', '\t')
    text = text.replace('\\"', '"').replace("\\'", "'")
    return text.strip()

def extract_json_data(html):
    """Extract embedded React/Next.js JSON data payload from HTML script tags."""
    soup = BeautifulSoup(html, 'html.parser')
    for script in soup.find_all('script'):
        if script.string and ('pageText' in script.string or 'pages_count' in script.string):
            return script.string
    return None

def parse_page_data(html):
    """Extract pageText, total pages count, title, and description."""
    script_content = extract_json_data(html)

    page_text, pages_count, title, description = "", 1, "", ""

    if script_content:
        match_text = re.search(r'pageText:\s*"(.*?)"\s*(?:,|\})', script_content, re.DOTALL)
        if match_text:
            page_text = clean_text(match_text.group(1))

        match_pages = re.search(r'pages_count:\s*(\d+)', script_content)
        if match_pages:
            pages_count = int(match_pages.group(1))

        match_title = re.search(r'title:\s*"(.*?)"\s*(?:,|\})', script_content)
        if match_title:
            title = clean_text(match_title.group(1))

        match_desc = re.search(r'description:\s*"(.*?)"\s*(?:,|\})', script_content)
        if match_desc:
            description = clean_text(match_desc.group(1))

    # Fallback to standard DOM extraction if needed
    if not page_text:
        soup = BeautifulSoup(html, 'html.parser')
        if not title:
            h1 = soup.find('h1')
            title = h1.get_text(strip=True) if h1 else "Untitled"

        content_div = soup.find('div', class_='aa_ht') or soup.find('div', class_='b-story-body-span')
        if content_div:
            page_text = content_div.get_text(separator="\n\n", strip=True)

    return title, description, page_text, pages_count

def download_story(story_url):
    """Loop through all pages of a story URL and combine them."""
    # Ensure clean base URL without existing page params
    clean_url = story_url.split('?')[0]

    first_page_res = requests.get(clean_url, headers=HEADERS)
    if first_page_res.status_code != 200:
        raise Exception(f"Failed to fetch page 1 (Status {first_page_res.status_code})")

    title, description, page_1_text, total_pages = parse_page_data(first_page_res.text)

    all_pages = [page_1_text]
    print(f" -> Story: '{title}' ({total_pages} page(s))")

    for page_num in range(2, total_pages + 1):
        page_url = f"{clean_url}?page={page_num}"
        print(f"    Fetching page {page_num}/{total_pages}...")

        res = requests.get(page_url, headers=HEADERS)
        if res.status_code == 200:
            _, _, p_text, _ = parse_page_data(res.text)
            if p_text:
                all_pages.append(p_text)
            else:
                print(f"    Warning: Could not extract text for page {page_num}")
        else:
            print(f"    Error fetching page {page_num}: Status {res.status_code}")

        time.sleep(1)

    full_story_body = "\n\n".join(all_pages)
    return title, description, full_story_body

def load_urls_from_file(filepath):
    """Read story URLs from a text file, ignoring empty lines and comments."""
    if not os.path.exists(filepath):
        print(f"Error: Could not find '{filepath}' in the current directory.")
        return []

    urls = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            url = line.strip()
            if url and not url.startswith('#'):
                urls.append(url)
    return urls

def main():
    urls = load_urls_from_file(LIST_FILE)
    if not urls:
        print(f"No URLs found in {LIST_FILE}. Please add story links to the file.")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    print(f"Loaded {len(urls)} story link(s) from {LIST_FILE}.\n")

    for idx, link in enumerate(urls, start=1):
        print(f"[{idx}/{len(urls)}] Processing: {link}")
        try:
            title, description, content = download_story(link)

            safe_title = title if title else link.rstrip('/').split('/')[-1]
            filename = sanitize_filename(safe_title) + ".txt"
            filepath = os.path.join(OUTPUT_DIR, filename)

            # Build header with metadata
            header = f"Title: {title}\n"
            if description:
                header += f"Description: {description}\n"
            header += f"URL: {link}\n"
            header += "=" * 50 + "\n\n"

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + content)

            print(f"Saved: {filename}\n")
        except Exception as e:
            print(f"Error downloading {link}: {e}\n")

        time.sleep(1.5)

    print(f"Finished! Saved stories to: '{OUTPUT_DIR}'")

if __name__ == "__main__":
    main()