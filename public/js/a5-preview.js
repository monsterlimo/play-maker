/**
 * A5 Programme Preview Component
 * Maintains strict A5 proportions (148mm x 210mm) for all programme previews
 */

class A5Preview {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = {
      showLabel: true,
      showOverflowWarning: true,
      title: 'A5 Print Preview',
      ...options
    };
    
    if (!this.container) {
      console.error(`A5Preview: Container with ID '${containerId}' not found`);
      return;
    }
    
    this.init();
  }
  
  init() {
    // Create the A5 preview structure
    this.container.innerHTML = `
      <div class="a5-preview-wrapper">
        ${this.options.title ? `<h4 style="margin: 0 0 20px 0; font-size: 1.3em; font-weight: 700; color: #1e3c72; text-align: center;">${this.options.title}</h4>` : ''}
        <div class="a5-preview-page" id="${this.containerId}_page">
          <div class="a5-preview-content" id="${this.containerId}_content">
            <div style="text-align: center; color: #999; padding: 100px 20px;">
              Select content to preview
            </div>
          </div>
        </div>
        ${this.options.showLabel ? '<div class="a5-preview-label">148mm × 210mm (A5)</div>' : ''}
        ${this.options.showOverflowWarning ? `<div class="a5-preview-overflow-warning" id="${this.containerId}_warning">⚠️ Content exceeds A5 page boundaries. Consider reducing content or splitting into multiple pages.</div>` : ''}
      </div>
    `;
    
    this.previewPage = document.getElementById(`${this.containerId}_page`);
    this.previewContent = document.getElementById(`${this.containerId}_content`);
    this.overflowWarning = document.getElementById(`${this.containerId}_warning`);
  }
  
  /**
   * Update the preview with new content
   * @param {string} htmlContent - HTML content to display
   * @param {Object} styles - Optional styles to apply to the page
   */
  updateContent(htmlContent, styles = {}) {
    if (!this.previewContent) return;
    
    // Apply background color to the page if provided
    if (styles.backgroundColor) {
      this.previewPage.style.backgroundColor = styles.backgroundColor;
    }
    
    // Apply text color to content if provided
    if (styles.color) {
      this.previewContent.style.color = styles.color;
    }
    
    // Update content
    this.previewContent.innerHTML = htmlContent;
    
    // Check for overflow after content is rendered
    this.checkOverflow();
  }
  
  /**
   * Check if content overflows the A5 boundaries and show warning if needed
   */
  checkOverflow() {
    if (!this.previewContent || !this.options.showOverflowWarning || !this.overflowWarning) return;
    
    // Use multiple methods to detect overflow accurately
    const checkMethods = [
      () => this.checkScrollOverflow(),
      () => this.checkComputedOverflow(),
      () => this.checkVirtualOverflow()
    ];
    
    // Run checks with delays to catch dynamic content
    setTimeout(() => this.runOverflowChecks(checkMethods), 10);
    setTimeout(() => this.runOverflowChecks(checkMethods), 100);
    setTimeout(() => this.runOverflowChecks(checkMethods), 300);
  }
  
  runOverflowChecks(checkMethods) {
    let hasOverflow = false;
    let overflowDetails = [];
    
    checkMethods.forEach((checkMethod, index) => {
      try {
        const result = checkMethod();
        if (result.hasOverflow) {
          hasOverflow = true;
          overflowDetails.push(`Method ${index + 1}: ${result.reason}`);
        }
      } catch (error) {
        console.warn(`A5Preview overflow check method ${index + 1} failed:`, error);
      }
    });
    
    if (hasOverflow) {
      this.showOverflowWarning(overflowDetails);
    } else {
      this.hideOverflowWarning();
    }
  }
  
  checkScrollOverflow() {
    const scrollHeight = this.previewContent.scrollHeight;
    const clientHeight = this.previewContent.clientHeight;
    const scrollWidth = this.previewContent.scrollWidth;
    const clientWidth = this.previewContent.clientWidth;
    
    const verticalOverflow = scrollHeight > clientHeight + 5; // 5px tolerance
    const horizontalOverflow = scrollWidth > clientWidth + 2; // 2px tolerance
    
    return {
      hasOverflow: verticalOverflow || horizontalOverflow,
      reason: verticalOverflow ? `Content height (${scrollHeight}px) exceeds container (${clientHeight}px)` : 
              horizontalOverflow ? `Content width (${scrollWidth}px) exceeds container (${clientWidth}px)` : 'No overflow'
    };
  }
  
  checkComputedOverflow() {
    const computedStyle = window.getComputedStyle(this.previewContent);
    const hasOverflow = computedStyle.overflow !== 'visible' && 
                       (this.previewContent.scrollHeight > this.previewContent.clientHeight ||
                        this.previewContent.scrollWidth > this.previewContent.clientWidth);
    
    return {
      hasOverflow: hasOverflow,
      reason: hasOverflow ? 'Computed style indicates overflow' : 'No computed overflow'
    };
  }
  
  checkVirtualOverflow() {
    // Create a virtual container to measure true content size
    const virtualContainer = document.createElement('div');
    virtualContainer.style.cssText = `
      position: absolute;
      visibility: hidden;
      top: -9999px;
      left: -9999px;
      width: 240px;
      font-family: 'Times New Roman', serif;
      font-size: 11px;
      line-height: 1.4;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      white-space: normal;
      word-wrap: break-word;
    `;
    
    virtualContainer.innerHTML = this.previewContent.innerHTML;
    document.body.appendChild(virtualContainer);
    
    const virtualHeight = virtualContainer.offsetHeight;
    const containerHeight = 357; // Fixed A5 content height
    
    document.body.removeChild(virtualContainer);
    
    return {
      hasOverflow: virtualHeight > containerHeight + 10, // 10px tolerance for virtual measurement
      reason: virtualHeight > containerHeight ? `Virtual content height (${virtualHeight}px) exceeds A5 content area (${containerHeight}px)` : 'No virtual overflow'
    };
  }
  
  showOverflowWarning(details = []) {
    if (!this.overflowWarning) return;
    
    this.overflowWarning.classList.add('show');
    
    // Add visual indication to the preview
    this.previewContent.style.border = '2px solid #dc3545';
    this.previewContent.style.borderRadius = '4px';
    
    // Update warning message with detailed information
    if (details.length > 0) {
      const detailText = details.join('; ');
      this.overflowWarning.innerHTML = `⚠️ Content exceeds A5 page boundaries. ${detailText}. Consider reducing content or splitting into multiple pages.`;
    }
  }
  
  hideOverflowWarning() {
    if (!this.overflowWarning) return;
    
    this.overflowWarning.classList.remove('show');
    
    // Remove visual indication
    this.previewContent.style.border = 'none';
  }
  
  /**
   * Clear the preview content
   */
  clear() {
    if (this.previewContent) {
      this.previewContent.innerHTML = '<div style="text-align: center; color: #999; padding: 100px 20px;">Select content to preview</div>';
    }
    if (this.previewPage) {
      this.previewPage.style.backgroundColor = '#ffffff';
    }
    this.hideOverflowWarning();
  }
  
  /**
   * Get the current preview content as HTML
   */
  getContent() {
    return this.previewContent ? this.previewContent.innerHTML : '';
  }
  
  /**
   * Static method to create an A5 preview with specific content
   */
  static createPreview(containerId, content, options = {}) {
    const preview = new A5Preview(containerId, options);
    if (content) {
      preview.updateContent(content, options.styles);
    }
    return preview;
  }
  
  /**
   * Static method to verify A5 dimensions are correct
   */
  static verifyA5Dimensions() {
    const expectedRatio = 148 / 210; // A5 ratio: 0.7047619047619048
    const previewRatio = 280 / 397;  // Our preview ratio
    const difference = Math.abs(expectedRatio - previewRatio);
    const tolerance = 0.0001; // Very small tolerance for floating point comparison
    
    return {
      isCorrect: difference < tolerance,
      expectedRatio: expectedRatio,
      actualRatio: previewRatio,
      difference: difference,
      widthPx: 280,
      heightPx: 397,
      widthMm: 148,
      heightMm: 210
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = A5Preview;
}

// Make available globally for direct HTML usage
if (typeof window !== 'undefined') {
  window.A5Preview = A5Preview;
}