def clamp_page(page: int, page_size: int) -> tuple[int, int, int]:
    page = max(page, 1)
    page_size = max(1, page_size)
    offset = (page - 1) * page_size
    return page, page_size, offset