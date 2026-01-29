"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Journal {
  title: string;
  issn: string;
  field_en: string;
  abs_rank: string | null;
  is_ft50: boolean;
  is_utd24: boolean;
}

interface OpenAlexAuthor {
  author?: {
    display_name?: string;
  };
}

interface OpenAlexSource {
  display_name?: string;
  issn?: string[];
}

interface OpenAlexLocation {
  source?: OpenAlexSource;
}

interface OpenAlexWork {
  id: string;
  display_name: string;
  publication_year?: number;
  publication_date?: string;
  cited_by_count?: number;
  doi?: string;
  ids?: {
    doi?: string;
  };
  primary_location?: OpenAlexLocation;
  authorships?: OpenAlexAuthor[];
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  abstract_inverted_index?: Record<string, number[]>;
}

export default function TopJournalQuery() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  // Language
  const [language, setLanguage] = useState<"en" | "zh">("en");

  // Filters
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedAbsRanks, setSelectedAbsRanks] = useState<string[]>([]);
  const [isFt50, setIsFt50] = useState(false);
  const [isUtd24, setIsUtd24] = useState(false);

  // Search Inputs
  const [keywords, setKeywords] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [sortBy, setSortBy] = useState("cited_by_count:desc");
  const [hasSearched, setHasSearched] = useState(false);

  // Results
  const [works, setWorks] = useState<OpenAlexWork[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // UI States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);
  const [detailWork, setDetailWork] = useState<OpenAlexWork | null>(null);
  const [selectedWorksMap, setSelectedWorksMap] = useState<Record<string, OpenAlexWork>>({});
  const [selectAllLoading, setSelectAllLoading] = useState(false);
  const [selectAllCountdown, setSelectAllCountdown] = useState(0);
  const selectAllAbortRef = useRef<AbortController | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportPageStart, setExportPageStart] = useState("1");
  const [exportPageEnd, setExportPageEnd] = useState("1");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportCountdown, setExportCountdown] = useState(0);
  const exportAbortRef = useRef<AbortController | null>(null);

  const translations = {
    en: {
      appTitle: "OpenAlex Journal Search",
      appSubtitle:
        "Search articles from top journals with OpenAlex and export results.",
      languageLabel: "Language",
      specialCollections: "Special Collections",
      absRanking: "ABS Ranking (2024)",
      researchFields: "Research Fields",
      selectAll: "Select All",
      deselectAll: "Deselect All",
      searchPanelTitle: "Article Search",
      keywordsLabel: "Keywords (OpenAlex search)",
      keywordsExampleLabel: "Example:",
      keywordsExample: "\"artificial intelligence\" OR \"machine learning\"",
      apiKeyLabel: "OpenAlex API Key (optional)",
      apiKeyHint: "Saved in browser cache (localStorage).",
      apiDocsLabel: "API docs",
      saveKey: "Save",
      yearLabel: "Year Range",
      yearFrom: "From",
      yearTo: "To",
      sortLabel: "Sort",
      sortByCites: "Citations (desc)",
      sortByYear: "Year (newest)",
      sortByYearOldest: "Year (oldest)",
      sortByTitle: "Title (A-Z)",
      pageSizeLabel: "Per page",
      searchButton: "Search",
      searching: "Searching...",
      resultsTitle: "Search Results",
      resultsCount: "Results",
      selectedCount: "Selected",
      exportRis: "Export RIS",
      exportSelected: "Export Selected",
      exportCurrentPage: "Export This Page",
      exportPageRange: "Export Page Range",
      exportRangeFrom: "From",
      exportRangeTo: "To",
      exportRangeLimit: "Max per export: 2000 results (up to {pages} pages).",
      exportRangeError: "Invalid page range.",
      exporting: "Exporting...",
      exportCountdownLabel: "Estimated time left",
      exportLimitTip: "Each export is capped at 2000 results. Export remaining pages separately.",
      exportTotalPages: "Total pages: {pages}",
      selectPage: "Select Page",
      selectAllResults: "Select All Results",
      clearSelection: "Clear Selection",
      selectingAll: "Selecting...",
      selectAllCountdownLabel: "Estimated time left",
      cancelSelectAll: "Cancel",
      selectAllLimit: "Select all is capped at 2000 results (OpenAlex limit).",
      noResults: "No results found. Adjust your filters or keywords.",
      journalPreview: "Matched Journals Preview",
      columnTitle: "Title",
      columnAuthors: "Authors",
      columnJournal: "Journal",
      columnYear: "Year",
      columnCites: "Cites",
      columnField: "Field",
      columnIssn: "ISSN",
      detailsTitle: "Article Details",
      detailsAuthors: "Authors",
      detailsJournal: "Journal",
      detailsYear: "Year",
      detailsDoi: "DOI",
      detailsUrl: "OpenAlex",
      detailsAbstract: "Abstract",
      close: "Close",
      unknown: "Unknown",
      page: "Page",
      of: "of",
      previous: "Previous",
      next: "Next",
      apiKeySaved: "API key saved.",
    },
    zh: {
      appTitle: "OpenAlex 期刊检索",
      appSubtitle: "基于顶级期刊筛选，使用 OpenAlex 抓取文献并导出。",
      languageLabel: "语言",
      specialCollections: "特殊列表",
      absRanking: "ABS 分级 (2024)",
      researchFields: "研究领域",
      selectAll: "全选",
      deselectAll: "取消全选",
      searchPanelTitle: "文献检索",
      keywordsLabel: "关键词（OpenAlex 搜索）",
      keywordsExampleLabel: "示例：",
      keywordsExample: "\"artificial intelligence\" OR \"machine learning\"",
      apiKeyLabel: "OpenAlex API Key（可选）",
      apiKeyHint: "密钥保存在浏览器缓存中（localStorage）。",
      apiDocsLabel: "API 文档",
      saveKey: "保存",
      yearLabel: "年份范围",
      yearFrom: "起始",
      yearTo: "结束",
      sortLabel: "排序",
      sortByCites: "引用数（降序）",
      sortByYear: "年份（最新）",
      sortByYearOldest: "年份（最旧）",
      sortByTitle: "标题（A-Z）",
      pageSizeLabel: "每页数量",
      searchButton: "搜索",
      searching: "搜索中...",
      resultsTitle: "检索结果",
      resultsCount: "结果数",
      selectedCount: "已选择",
      exportRis: "导出 RIS",
      exportSelected: "导出所选",
      exportCurrentPage: "导出此页",
      exportPageRange: "导出页码范围",
      exportRangeFrom: "起始",
      exportRangeTo: "结束",
      exportRangeLimit: "每次最多 2000 篇（最多 {pages} 页）。",
      exportRangeError: "页码范围不合法。",
      exporting: "正在导出...",
      exportCountdownLabel: "预计剩余时间",
      exportLimitTip: "每次最多 2000 篇，请分批导出剩余页数。",
      exportTotalPages: "总页数：{pages}",
      selectPage: "全选本页",
      selectAllResults: "全选全部",
      clearSelection: "取消全选",
      selectingAll: "正在全选...",
      selectAllCountdownLabel: "预计剩余时间",
      cancelSelectAll: "取消全选",
      selectAllLimit: "全选最多 2000 篇（OpenAlex 限制）。",
      noResults: "未找到结果，请调整条件。",
      journalPreview: "匹配期刊预览",
      columnTitle: "标题",
      columnAuthors: "作者",
      columnJournal: "期刊",
      columnYear: "年份",
      columnCites: "引用",
      columnField: "领域",
      columnIssn: "ISSN",
      detailsTitle: "详细信息",
      detailsAuthors: "作者",
      detailsJournal: "期刊",
      detailsYear: "年份",
      detailsDoi: "DOI",
      detailsUrl: "OpenAlex",
      detailsAbstract: "摘要",
      close: "关闭",
      unknown: "未知",
      page: "第",
      of: "页 / 共",
      previous: "上一页",
      next: "下一页",
      apiKeySaved: "API Key 已保存。",
    },
  } as const;

  const t = translations[language];

  const getFieldLabel = (journal: Journal) => {
    const field = journal.field_en?.trim();
    if (!field) return t.unknown;
    return field;
  };

  useEffect(() => {
    const cachedKey = localStorage.getItem("openalex_api_key") || "";
    setApiKey(cachedKey);
  }, []);

  // Load journal data from local public file
  useEffect(() => {
    fetch("/journals.json")
      .then((res) => res.json())
      .then((data: Journal[]) => {
        setJournals(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load journals", err);
        setLoading(false);
      });
  }, []);

  const uniqueFields = useMemo(() => {
    const fields = new Set(
      journals.map((j) => getFieldLabel(j)).filter((f) => f && f !== t.unknown)
    );
    return Array.from(fields).sort();
  }, [journals, language]);

  const uniqueAbsRanks = useMemo(() => {
    return ["4*", "4", "3", "2", "1"];
  }, []);

  const filteredJournals = useMemo(() => {
    return journals.filter((journal) => {
      let matchesSpecial = true;
      if (isFt50 || isUtd24) {
        matchesSpecial =
          (isFt50 && journal.is_ft50) || (isUtd24 && journal.is_utd24);
      }
      if (!matchesSpecial) return false;

      if (selectedFields.length > 0) {
        const fieldLabel = getFieldLabel(journal);
        if (!selectedFields.includes(fieldLabel)) return false;
      }

      if (selectedAbsRanks.length > 0) {
        const matchesAbs =
          journal.abs_rank !== null && selectedAbsRanks.includes(journal.abs_rank);
        if (!matchesAbs) return false;
      }

      return true;
    });
  }, [journals, selectedFields, selectedAbsRanks, isFt50, isUtd24]);

  const issnList = useMemo(() => {
    return Array.from(
      new Set(
        filteredJournals
          .map((j) => j.issn)
          .filter((issn) => issn && issn.length > 4 && issn !== "nan")
          .map((issn) => issn.trim())
      )
    );
  }, [filteredJournals]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const maxExportPages = Math.max(1, Math.floor(2000 / pageSize));

  const getAuthorsText = (work: OpenAlexWork) => {
    const authors =
      work.authorships
        ?.map((a) => a.author?.display_name)
        .filter(Boolean)
        .join(", ") || "";
    return authors || t.unknown;
  };

  const getJournalText = (work: OpenAlexWork) => {
    return work.primary_location?.source?.display_name || t.unknown;
  };

  const reconstructAbstract = (index?: Record<string, number[]>) => {
    if (!index) return "";
    const entries = Object.entries(index);
    let maxPosition = 0;
    entries.forEach(([_, positions]) => {
      positions.forEach((pos) => {
        if (pos > maxPosition) maxPosition = pos;
      });
    });
    const words = Array(maxPosition + 1).fill("");
    entries.forEach(([word, positions]) => {
      positions.forEach((pos) => {
        words[pos] = word;
      });
    });
    return words.join(" ").trim();
  };

  const workToRis = (work: OpenAlexWork) => {
    const lines: string[] = [];
    lines.push("TY  - JOUR");
    if (work.display_name) lines.push(`TI  - ${work.display_name}`);
    work.authorships?.forEach((a) => {
      const name = a.author?.display_name;
      if (name) lines.push(`AU  - ${name}`);
    });
    const journal = work.primary_location?.source?.display_name;
    if (journal) lines.push(`JO  - ${journal}`);
    const issn = work.primary_location?.source?.issn?.[0];
    if (issn) lines.push(`SN  - ${issn}`);
    if (work.publication_year) lines.push(`PY  - ${work.publication_year}`);
    if (work.biblio?.volume) lines.push(`VL  - ${work.biblio.volume}`);
    if (work.biblio?.issue) lines.push(`IS  - ${work.biblio.issue}`);
    if (work.biblio?.first_page) lines.push(`SP  - ${work.biblio.first_page}`);
    if (work.biblio?.last_page) lines.push(`EP  - ${work.biblio.last_page}`);
    const doi = work.doi || work.ids?.doi;
    if (doi) lines.push(`DO  - ${doi.replace("https://doi.org/", "")}`);
    if (work.id) lines.push(`UR  - ${work.id}`);
    const abstract = reconstructAbstract(work.abstract_inverted_index);
    if (abstract) lines.push(`AB  - ${abstract}`);
    lines.push("ER  -");
    return lines.join("\n");
  };

  const exportWorksToRis = (list: OpenAlexWork[], filename: string) => {
    if (list.length === 0) return;
    const risContent = list.map(workToRis).join("\n\n");
    const blob = new Blob([risContent], { type: "application/x-research-info-systems" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSelectedRis = () => {
    const selectedWorks = selectedWorkIds
      .map((id) => selectedWorksMap[id])
      .filter(Boolean);
    exportWorksToRis(selectedWorks, "openalex_selected.ris");
  };

  const exportCurrentPage = () => {
    exportWorksToRis(works, `openalex_page_${currentPage}.ris`);
  };

  const exportPageRange = async () => {
    const start = Number(exportPageStart);
    const end = Number(exportPageEnd);
    if (!start || !end || start < 1 || end < start || end > totalPages) {
      setExportError(t.exportRangeError);
      return;
    }
    if (end - start + 1 > maxExportPages) {
      setExportError(t.exportRangeError);
      return;
    }
    setExportError("");
    setExportLoading(true);
    setExportCountdown(0);
    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    let countdownTimer: number | null = null;
    try {
      const allWorks: OpenAlexWork[] = [];
      const perPageExport = 200;
      const startIndex = (start - 1) * pageSize;
      const endIndex = Math.min(end * pageSize, totalCount);
      const startPage = Math.floor(startIndex / perPageExport) + 1;
      const endPage = Math.ceil(endIndex / perPageExport);
      const totalPagesToFetch = endPage - startPage + 1;
      const totalToFetch = endIndex - startIndex;
      const estimatedSeconds = Math.max(
        1,
        Math.min(40, Math.ceil((totalToFetch * 40) / 2000))
      );
      setExportCountdown(estimatedSeconds);
      countdownTimer = window.setInterval(() => {
        setExportCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      for (let page = startPage; page <= endPage; page += 1) {
        const url = buildSearchUrl(page).replace(
          `per_page=${pageSize}`,
          `per_page=${perPageExport}`
        );
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`OpenAlex error: ${res.status}`);
        }
        const data = await res.json();
        const results = data.results || [];
        allWorks.push(...results);
      }
      const sliceOffset = startIndex - (startPage - 1) * perPageExport;
      const sliceCount = endIndex - startIndex;
      const exportSlice = allWorks.slice(sliceOffset, sliceOffset + sliceCount);
      exportWorksToRis(exportSlice, `openalex_pages_${start}-${end}.ris`);
      setExportMenuOpen(false);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setExportError(String(error));
      }
      console.error(error);
    } finally {
      if (countdownTimer !== null) {
        window.clearInterval(countdownTimer);
      }
      exportAbortRef.current = null;
      setExportCountdown(0);
      setExportLoading(false);
    }
  };

  const cancelExport = () => {
    exportAbortRef.current?.abort();
    setExportLoading(false);
    setExportCountdown(0);
  };

  const handleSaveKey = () => {
    localStorage.setItem("openalex_api_key", apiKey.trim());
    alert(t.apiKeySaved);
  };

  const buildSearchUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("per_page", String(pageSize));
    params.set("page", String(page));
    if (keywords.trim()) {
      params.set("search", keywords.trim());
    }
    const filters: string[] = [];
    if (issnList.length > 0) {
      filters.push(`primary_location.source.issn:${issnList.join("|")}`);
    }
    if (yearStart.trim()) {
      filters.push(`from_publication_date:${yearStart.trim()}-01-01`);
    }
    if (yearEnd.trim()) {
      filters.push(`to_publication_date:${yearEnd.trim()}-12-31`);
    }
    if (filters.length > 0) {
      params.set("filter", filters.join(","));
    }
    if (sortBy.trim()) {
      params.set("sort", sortBy.trim());
    }
    if (apiKey.trim()) {
      params.set("api_key", apiKey.trim());
    }
    return `https://api.openalex.org/works?${params.toString()}`;
  };

  const searchOpenAlex = async (page: number, resetCache = false) => {
    setSearchLoading(true);
    setSearchError("");
    try {
      const url = buildSearchUrl(page);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`OpenAlex error: ${res.status}`);
      }
      const data = await res.json();
      const results = data.results || [];
      setWorks(results);
      setTotalCount(data.meta?.count || 0);
      // Keep selections across pages; only reset on a new search.
      if (resetCache) {
        const map: Record<string, OpenAlexWork> = {};
        results.forEach((work: OpenAlexWork) => {
          map[work.id] = work;
        });
        setSelectedWorksMap(map);
      } else {
        setSelectedWorksMap((prev) => {
          const next = { ...prev };
          results.forEach((work: OpenAlexWork) => {
            next[work.id] = work;
          });
          return next;
        });
      }
    } catch (error) {
      console.error(error);
      setSearchError(String(error));
      setWorks([]);
      setTotalCount(0);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = () => {
    if (issnList.length === 0) {
      setSearchError(t.noResults);
      setWorks([]);
      setTotalCount(0);
      setSelectedWorkIds([]);
      return;
    }
    setCurrentPage(1);
    setHasSearched(true);
    setSelectedWorksMap({});
    setSelectedWorkIds([]);
    searchOpenAlex(1, true);
  };

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
    searchOpenAlex(nextPage);
  };

  useEffect(() => {
    if (!hasSearched) return;
    setCurrentPage(1);
    searchOpenAlex(1, true);
  }, [sortBy, pageSize]);

  const selectCurrentPage = () => {
    const ids = works.map((w) => w.id);
    setSelectedWorkIds(ids);
  };

  const selectAllResults = async () => {
    if (!hasSearched) return;
    setSelectAllLoading(true);
    setSearchError("");
    try {
      const maxResults = 2000;
      const totalToFetch = Math.min(totalCount, maxResults);
      const perPage = 200;
      const totalPagesToFetch = Math.ceil(totalToFetch / perPage);
      const estimatedSeconds = Math.max(1, Math.min(40, Math.ceil((totalToFetch * 40) / 2000)));
      setSelectAllCountdown(estimatedSeconds);
      selectAllAbortRef.current?.abort();
      const controller = new AbortController();
      selectAllAbortRef.current = controller;
      const countdownTimer = window.setInterval(() => {
        setSelectAllCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      const allWorks: OpenAlexWork[] = [];
      for (let page = 1; page <= totalPagesToFetch; page += 1) {
        const url = buildSearchUrl(page).replace(
          `per_page=${pageSize}`,
          `per_page=${perPage}`
        );
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`OpenAlex error: ${res.status}`);
        }
        const data = await res.json();
        const results = data.results || [];
        allWorks.push(...results);
      }
      window.clearInterval(countdownTimer);
      const map: Record<string, OpenAlexWork> = {};
      allWorks.forEach((work) => {
        map[work.id] = work;
      });
      setSelectedWorksMap(map);
      setSelectedWorkIds(allWorks.map((w) => w.id));
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setSearchError(String(error));
      }
      console.error(error);
    } finally {
      selectAllAbortRef.current = null;
      setSelectAllCountdown(0);
      setSelectAllLoading(false);
    }
  };

  const cancelSelectAll = () => {
    selectAllAbortRef.current?.abort();
    setSelectAllLoading(false);
    setSelectAllCountdown(0);
  };

  const clearSelection = () => {
    setSelectedWorkIds([]);
  };

  const toggleSelection = (
    list: string[],
    item: string,
    setter: (val: string[]) => void
  ) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        <header className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t.appTitle}</h1>
              <p className="opacity-80 mt-2">{t.appSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <span className="text-xs uppercase tracking-wider opacity-80">
                {t.languageLabel}
              </span>
              <div className="inline-flex rounded-lg border border-white/30 overflow-hidden">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${
                    language === "en"
                      ? "bg-white text-blue-700"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("zh")}
                  className={`px-3 py-1.5 text-xs font-semibold transition ${
                    language === "zh"
                      ? "bg-white text-blue-700"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  中文
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8 border-r border-gray-100 pr-4">
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 uppercase tracking-wider text-sm">
                {t.specialCollections}
              </h3>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center space-x-2 cursor-pointer select-none border px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={isFt50}
                    onChange={(e) => setIsFt50(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="font-medium">FT50</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none border px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={isUtd24}
                    onChange={(e) => setIsUtd24(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="font-medium">UTD24</span>
                </label>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-3 uppercase tracking-wider text-sm">
                {t.absRanking}
              </h3>
              <div className="flex flex-wrap gap-2">
                {uniqueAbsRanks.map((rank) => (
                  <button
                    key={rank}
                    onClick={() =>
                      toggleSelection(selectedAbsRanks, rank, setSelectedAbsRanks)
                    }
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      selectedAbsRanks.includes(rank)
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {rank}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700 uppercase tracking-wider text-sm">
                  {t.researchFields}
                </h3>
                <button
                  onClick={() =>
                    setSelectedFields(
                      selectedFields.length === uniqueFields.length
                        ? []
                        : [...uniqueFields]
                    )
                  }
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedFields.length === uniqueFields.length
                    ? t.deselectAll
                    : t.selectAll}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 p-2 border rounded-lg bg-gray-50 text-sm scrollbar-thin scrollbar-thumb-gray-300">
                {uniqueFields.map((field) => (
                  <label
                    key={field}
                    className="flex items-center space-x-2 p-1.5 hover:bg-white rounded cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onChange={() =>
                        toggleSelection(selectedFields, field, setSelectedFields)
                      }
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="truncate" title={field}>
                      {field}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-3">
                {t.journalPreview}
              </h3>
              <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 font-medium sticky top-0">
                    <tr>
                      <th className="px-3 py-2">{t.columnJournal}</th>
                      <th className="px-3 py-2 w-32">{t.columnField}</th>
                      <th className="px-3 py-2 w-24">{t.columnIssn}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredJournals.length > 0 ? (
                      filteredJournals.map((journal, idx) => (
                        <tr key={`${journal.issn}-${idx}`} className="hover:bg-blue-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {journal.title}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {getFieldLabel(journal)}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-500">
                            {journal.issn}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-gray-500">
                          {loading ? "Loading..." : t.noResults}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8 flex flex-col h-full">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {t.searchPanelTitle}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.apiKeyLabel}
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="api_key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{t.apiKeyHint}</span>
                    <a
                      href="https://docs.openalex.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      {t.apiDocsLabel}
                    </a>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.keywordsLabel}
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    <span className="font-medium text-gray-600">
                      {t.keywordsExampleLabel}
                    </span>{" "}
                    {t.keywordsExample}
                  </div>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder={t.keywordsExample}
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.yearLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder={t.yearFrom}
                      value={yearStart}
                      onChange={(e) => setYearStart(e.target.value)}
                    />
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder={t.yearTo}
                      value={yearEnd}
                      onChange={(e) => setYearEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.sortLabel}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="cited_by_count:desc">{t.sortByCites}</option>
                    <option value="publication_date:desc">{t.sortByYear}</option>
                    <option value="publication_date:asc">{t.sortByYearOldest}</option>
                    <option value="display_name:asc">{t.sortByTitle}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.pageSizeLabel}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[20, 30, 40, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 rounded-md border text-gray-700 hover:bg-white transition"
                >
                  {t.saveKey}
                </button>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
                  disabled={searchLoading}
                >
                  {searchLoading ? t.searching : t.searchButton}
                </button>
              </div>
              {searchError && (
                <p className="text-sm text-red-600 mt-3">{searchError}</p>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">{t.resultsTitle}</h3>
                <div className="text-sm text-gray-600 flex items-center gap-4">
                  <span>
                    {t.resultsCount}:{" "}
                    <strong className="text-gray-900">{totalCount}</strong>
                  </span>
                  <span>
                    {t.selectedCount}:{" "}
                    <strong className="text-gray-900">
                      {selectedWorkIds.length}
                    </strong>
                  </span>
                  <button
                    onClick={selectCurrentPage}
                    className="px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition"
                  >
                    {t.selectPage}
                  </button>
                  <button
                    onClick={selectAllResults}
                    className="px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={selectAllLoading}
                  >
                    {t.selectAllResults}
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition"
                  >
                    {t.clearSelection}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setExportMenuOpen((prev) => !prev)}
                      className="px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition"
                    >
                      {t.exportRis}
                    </button>
                    {exportMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              exportSelectedRis();
                              setExportMenuOpen(false);
                            }}
                            className="text-left text-sm text-gray-700 hover:text-gray-900"
                          >
                            {t.exportSelected}
                          </button>
                          <button
                            onClick={() => {
                              exportCurrentPage();
                              setExportMenuOpen(false);
                            }}
                            className="text-left text-sm text-gray-700 hover:text-gray-900"
                          >
                            {t.exportCurrentPage}
                          </button>
                          <div className="pt-2 border-t text-xs text-gray-500">
                            {t.exportPageRange}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              value={exportPageStart}
                              onChange={(e) => setExportPageStart(e.target.value)}
                              placeholder={t.exportRangeFrom}
                            />
                            <span className="text-xs text-gray-500">-</span>
                            <input
                              className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              value={exportPageEnd}
                              onChange={(e) => setExportPageEnd(e.target.value)}
                              placeholder={t.exportRangeTo}
                            />
                            <button
                              onClick={exportPageRange}
                              className="px-2 py-1 rounded-md border text-gray-700 hover:bg-gray-50 text-xs"
                              disabled={exportLoading}
                            >
                              {exportLoading ? t.searching : t.exportRis}
                            </button>
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {t.exportRangeLimit.replace("{pages}", String(maxExportPages))}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {t.exportTotalPages.replace("{pages}", String(totalPages))}
                          </div>
                          {exportError && (
                            <div className="text-xs text-red-600">{exportError}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 font-medium sticky top-0">
                    <tr>
                      <th className="px-3 py-3 w-10"></th>
                      <th className="px-3 py-3">{t.columnTitle}</th>
                      <th className="px-3 py-3 w-40">{t.columnAuthors}</th>
                      <th className="px-3 py-3 w-40">{t.columnJournal}</th>
                      <th className="px-3 py-3 w-16">{t.columnYear}</th>
                      <th className="px-3 py-3 w-16">{t.columnCites}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {works.length > 0 ? (
                      works.map((work) => (
                        <tr key={work.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedWorkIds.includes(work.id)}
                              onChange={() =>
                                toggleSelection(
                                  selectedWorkIds,
                                  work.id,
                                  setSelectedWorkIds
                                )
                              }
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-900">
                            <button
                              onClick={() => setDetailWork(work)}
                              className="text-left text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {work.display_name || t.unknown}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-gray-500">
                            {getAuthorsText(work)}
                          </td>
                          <td className="px-3 py-3 text-gray-500">
                            {getJournalText(work)}
                          </td>
                          <td className="px-3 py-3 text-gray-500">
                            {work.publication_year ?? "-"}
                          </td>
                          <td className="px-3 py-3 text-gray-500">
                            {work.cited_by_count ?? "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          {searchLoading ? t.searching : t.noResults}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                <span>
                  {t.page} {currentPage} {t.of} {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || searchLoading}
                    className="px-3 py-1.5 rounded-md border text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    {t.previous}
                  </button>
                  <button
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages || searchLoading}
                    className="px-3 py-1.5 rounded-md border text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    {t.next}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <footer className="text-center text-xs text-gray-500 py-4">Harry Lee</footer>
      </div>

      {selectAllLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">{t.selectingAll}</span>
              {selectAllCountdown > 0 && (
                <span className="text-xs text-gray-500">
                  {t.selectAllCountdownLabel}: {selectAllCountdown}s
                </span>
              )}
              {totalCount > 2000 && (
                <span className="text-xs text-gray-500">{t.selectAllLimit}</span>
              )}
            </div>
            <button
              onClick={cancelSelectAll}
              className="ml-4 px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition"
            >
              {t.cancelSelectAll}
            </button>
          </div>
        </div>
      )}

      {exportLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">{t.exporting}</span>
              {exportCountdown > 0 && (
                <span className="text-xs text-gray-500">
                  {t.exportCountdownLabel}: {exportCountdown}s
                </span>
              )}
              <span className="text-xs text-gray-500">{t.exportLimitTip}</span>
            </div>
            <button
              onClick={cancelExport}
              className="ml-4 px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition"
            >
              {t.cancelSelectAll}
            </button>
          </div>
        </div>
      )}

      {detailWork && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t.detailsTitle}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {detailWork.display_name || t.unknown}
                </p>
              </div>
              <button
                onClick={() => setDetailWork(null)}
                className="px-3 py-1.5 rounded-md border text-gray-700 hover:bg-gray-50 transition"
              >
                {t.close}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-gray-900">{t.detailsAuthors}:</span>{" "}
                {getAuthorsText(detailWork)}
              </div>
              <div>
                <span className="font-semibold text-gray-900">{t.detailsJournal}:</span>{" "}
                {getJournalText(detailWork)}
              </div>
              <div>
                <span className="font-semibold text-gray-900">{t.detailsYear}:</span>{" "}
                {detailWork.publication_year ?? "-"}
              </div>
              <div>
                <span className="font-semibold text-gray-900">{t.detailsDoi}:</span>{" "}
                {detailWork.doi || detailWork.ids?.doi || "-"}
              </div>
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-900">{t.detailsUrl}:</span>{" "}
                <a
                  href={detailWork.id}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-700 hover:underline"
                >
                  {detailWork.id}
                </a>
              </div>
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-900">{t.detailsAbstract}:</span>
                <div className="mt-1 text-gray-600 max-h-48 overflow-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                  {reconstructAbstract(detailWork.abstract_inverted_index) || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
