// == ORCA-TOC Plugin ==
// Floating Outline Panel for Orca Note
// Positioned to the right of .orca-block-editor-main
// Hover bar width: 20px

let outlineContainer = null
let headingNodes = []
let unsubscribe = null

function createOutlineNodes() {
  // Create main container
  outlineContainer = document.createElement('div')
  outlineContainer.id = 'orca-toc-container'
  outlineContainer.className = 'orca-toc-container'
  outlineContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 17px;
    z-index: var(--orca-zindex-editor-sidepanel, 1000);
    position: fixed;
    right: 300px;
    top: 100px;
    border-radius: 8px;
    padding: 10px;
    opacity: 0.8;
    transition: opacity 0.3s ease;
  `
  
  // Add mouse enter event to show all tooltips
  outlineContainer.addEventListener('mouseenter', () => {
    // Set a flag to indicate mouse is over container
    outlineContainer.dataset.mouseOver = 'true'
    showAllTooltips()
  })
  
  // Add mouse leave event to restore active tooltip
  outlineContainer.addEventListener('mouseleave', () => {
    // Clear the flag
    outlineContainer.dataset.mouseOver = 'false'
    checkCursorInHeading()
  })
  
  // Position as fixed element on body
  positionOutlineContainer()
}

function showAllTooltips() {
  headingNodes.forEach(({ node, item }) => {
    const tooltip = node.querySelector('.orca-toc-tooltip')
    if (tooltip) {
      tooltip.textContent = `${item.text}`
      tooltip.style.opacity = '1'
      tooltip.style.visibility = 'visible'
      tooltip.style.transition = 'none'
    }
  })
}

function addShakeAnimation(element) {
  // Add shake class
  element.classList.add('orca-toc-shake')
  
  // Remove shake class after animation completes
  setTimeout(() => {
    element.classList.remove('orca-toc-shake')
  },1000) // Match animation duration
}

// Add shake animation style
function addShakeStyle() {
  // Check if style already exists
  if (!document.getElementById('orca-toc-shake-style')) {
    const style = document.createElement('style')
    style.id = 'orca-toc-shake-style'
    style.textContent = `
      @keyframes orca-toc-shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      .orca-toc-shake {
        animation: orca-toc-shake 1s ease-in-out;
      }
    `
    document.head.appendChild(style)
  }
}

function positionOutlineContainer() {
  if (!outlineContainer) return
  
  // Step 1: Remove from any parent if already added
  // This ensures we don't have duplicate containers
  if (outlineContainer.parentNode) {
    outlineContainer.parentNode.removeChild(outlineContainer)
  }
  
  // Step 2: Add to body for fixed positioning
  // Fixed positioning allows the container to stay in place regardless of scroll
  document.body.appendChild(outlineContainer)
  
  // Step 3: Ensure fixed positioning styles are applied
  // Set position to fixed and top to 300px from the top of the viewport
  outlineContainer.style.position = 'fixed'
  outlineContainer.style.top = '200px'
  outlineContainer.style.bottom = 'auto'
  
  // Step 4: Position to the left of .orca-block-editor right boundary
  const editorContainer = document.querySelector('.orca-panel active')
  if (editorContainer) {
    const editorRect = editorContainer.getBoundingClientRect()
    // Position 10px to the left of the editor's right boundary
    outlineContainer.style.left = `${editorRect.right - 120}px`
    outlineContainer.style.right = 'auto'
  } else {
    // Fallback if editor not found
    outlineContainer.style.right = '80px'
    outlineContainer.style.left = 'auto'
  }
}

function updateOutlineNodes() {
  if (!outlineContainer) return
  
  // Clear existing nodes
  outlineContainer.innerHTML = ''
  headingNodes = []
  
  // Find all heading blocks directly from DOM
  const outlineItems = []
  
  // Direct DOM scan for heading elements
  function scanDOMForHeadings() {
    console.log('Scanning DOM for heading elements...')
    
    // Get all heading blocks within non-hidden orca-hideable elements
    const headingBlocks = document.querySelectorAll('.orca-hideable:not(.orca-hideable-hidden) [data-type="heading"]')
    console.log(`Found ${headingBlocks.length} heading blocks in non-hidden orca-hideable elements`)
    
    headingBlocks.forEach((blockElement, index) => {
      const blockId = blockElement.dataset.id
      if (!blockId) return
      
      console.log(`Processing DOM heading block ${index}: id=${blockId}`)
      
      // Extract level
      let level = 1
      const levelAttr = blockElement.dataset.level
      if (levelAttr) {
        level = parseInt(levelAttr)
      }
      console.log(`Extracted level: ${level}`)
      
      // Extract text
      let text = ''
      
      // Try multiple ways to extract text
      const inlineElement = blockElement.querySelector('.orca-inline[data-type="t"]')
      if (inlineElement) {
        text = inlineElement.textContent || ''
        console.log(`Text from .orca-inline[data-type="t"]: "${text}"`)
      }
      
      // If no text found, try other elements
      if (!text) {
        const contentElement = blockElement.querySelector('.orca-repr-main-content')
        if (contentElement) {
          text = contentElement.textContent || ''
          console.log(`Text from .orca-repr-main-content: "${text}"`)
        }
      }
      
      if (text) {
        console.log(`Extracted heading: "${text}" (level ${level})`)
        outlineItems.push({
          id: blockId,
          text: text,
          level: level
        })
      } else {
        console.log(`No text found for DOM heading block ${blockId}`)
      }
    })
  }
  
  // Run DOM scan
  scanDOMForHeadings()
  
  // Also try the original method as fallback
  const blocks = window.orca.state.blocks
  if (blocks) {
    console.log('Trying original method with blocks state...')
    const processedBlockIds = new Set()
    
    function traverseBlock(blockId) {
      if (processedBlockIds.has(blockId)) return
      processedBlockIds.add(blockId)
      
      const block = blocks[blockId]
      if (!block) return
      
      if (block.type === 'heading') {
        let level = 1
        if (block.data && block.data.level) {
          level = parseInt(block.data.level)
        }
        
        let text = ''
        if (block.content && Array.isArray(block.content)) {
          text = block.content.map(fragment => {
            if (typeof fragment === 'object' && fragment !== null) {
              if (fragment.t === 't' && typeof fragment.v === 'string') {
                return fragment.v
              }
            }
            return ''
          }).join('')
        }
        
        if (text && !outlineItems.find(item => item.id === blockId)) {
          console.log(`Extracted from state: "${text}" (level ${level})`)
          outlineItems.push({
            id: blockId,
            text: text,
            level: level
          })
        }
      }
      
      if (block.children) {
        block.children.forEach(childId => traverseBlock(childId))
      }
    }
    
    Object.keys(blocks).forEach(blockId => {
      const block = blocks[blockId]
      if (block && !block.parent_id) {
        traverseBlock(blockId)
      }
    })
  }
  
  // Remove duplicates by block ID
  const uniqueOutlineItems = []
  const seenIds = new Set()
  outlineItems.forEach(item => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id)
      uniqueOutlineItems.push(item)
    }
  })
  
  // Use unique items
  outlineItems.length = 0
  uniqueOutlineItems.forEach(item => outlineItems.push(item))
  
  // Create nodes for each heading
  outlineItems.forEach((item, index) => {
    const node = document.createElement('div')
    node.className = 'orca-toc-node'
    // Calculate width based on heading level (1-6), minimum 10px，节点颜色为queryConditions的颜色
    const width = Math.max(10, 25 - (item.level - 1) * 3)
    node.style.cssText = `
      width: ${width}px;
      height: 5px;
      border-radius: 4px;
      background-color: rgb(228, 228, 229);
      cursor: pointer;
      position: relative;
      align-self: flex-start;
    `
    
    // Create tooltip
    const tooltip = document.createElement('div')
    tooltip.className = 'orca-toc-tooltip'
    tooltip.style.cssText = `
      position: absolute;
      left: 35px;
      top: 50%;
      transform: translateY(-50%);
      color: #222222ff;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      z-index: 1001;
    `
    tooltip.textContent = `${item.text}`
    
    // Add event listener only for click
    node.addEventListener('click', async (event) => {
      // Prevent event propagation to avoid duplicate triggers
      event.stopPropagation()
      
      console.log(`Clicking node for heading "${item.text}" (id: ${item.id})`)
      
      // Try direct DOM manipulation with correct selector
      console.log('Trying direct DOM scroll...')
      const blockElement = document.querySelector(`[data-id="${item.id}"]`)
      if (blockElement) {
        console.log('Found block element:', blockElement)
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Add shake animation to the heading
        addShakeAnimation(blockElement)
        
        // Update tooltip immediately
        const tooltip = node.querySelector('.orca-toc-tooltip')
        if (tooltip) {
          tooltip.textContent = `${item.text}`
          tooltip.style.opacity = '1'
          tooltip.style.visibility = 'visible'
          tooltip.style.transition = 'none'
          tooltip.classList.add('orca-toc-tooltip-active')
        }
      } else {
        console.log('Block element not found for ID:', item.id)
      }
    })
    
    node.appendChild(tooltip)
    outlineContainer.appendChild(node)
    headingNodes.push({ node, item })
  })
  
  // Log total outline items
  console.log(`Total outline items found: ${outlineItems.length}`)
  
  // Update position after nodes are created
  setTimeout(() => {
    positionOutlineContainer()
  }, 10) // Small delay to ensure container height is calculated
}

function setupScrollListener() {
  const blocksContainer = document.querySelector('.orca-block-editor-blocks')
  if (!blocksContainer) return
  
  blocksContainer.addEventListener('scroll', () => {
    // Highlight current heading node
    highlightCurrentHeading()
    // Recheck cursor position after scroll
    checkCursorInHeading()
  })
  
  // Add window resize listener to update position
  window.addEventListener('resize', () => {
    positionOutlineContainer()
  })
}





function highlightCurrentHeading() {
  const blocksContainer = document.querySelector('.orca-block-editor-blocks')
  if (!blocksContainer || headingNodes.length === 0) return
  
  const blocksRect = blocksContainer.getBoundingClientRect()
  
  headingNodes.forEach(({ node, item }) => {
    const blockElement = document.querySelector(`[data-id="${item.id}"]`)
    if (!blockElement) return
    
    const blockRect = blockElement.getBoundingClientRect()
    const isVisible = blockRect.top >= blocksRect.top && blockRect.bottom <= blocksRect.bottom
    
    if (isVisible) {
      node.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
    } else {
      node.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
    }
  })
}



async function load(_pluginName) {
  console.log('ORCA-TOC plugin loading...')
  
  // Add shake animation style
  addShakeStyle()
  
  // Wait for Orca to be ready
  await new Promise(resolve => {
    const checkOrca = () => {
      if (window.orca && window.orca.state && window.orca.state.blocks) {
        resolve()
      } else {
        setTimeout(checkOrca, 100)
      }
    }
    checkOrca()
  })
  
  // Create outline nodes
  createOutlineNodes()
  
  // Update outline initially
  updateOutlineNodes()
  
  // Set up scroll listener
  setupScrollListener()
  
  // Set up cursor position listener if available
  setupCursorListener()
  
  // Watch for block changes using Valtio subscribe
  const { subscribe } = window.Valtio
  
  // Add debounce to avoid multiple rapid updates
  let updateTimeout
  unsubscribe = subscribe(window.orca.state, () => {
    // Debounce updates to avoid performance issues
    clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      updateOutlineNodes()
      // Recheck cursor position after block changes
      checkCursorInHeading()
    }, 200) // 200ms debounce
  })
  
  console.log('ORCA-TOC plugin loaded successfully')
}

function setupCursorListener() {
  // Try to listen for cursor changes
  // This is a placeholder - actual implementation depends on Orca API
  const editorContainer = document.querySelector('.orca-block-editor')
  if (editorContainer) {
    // Listen for keyboard events that might change cursor position
    editorContainer.addEventListener('keyup', () => {
      // Check if cursor is in a heading block
      checkCursorInHeading()
    })
    
    // Listen for selection change events
    document.addEventListener('selectionchange', () => {
      // Debounce to avoid multiple rapid calls
      clearTimeout(window.cursorCheckTimeout)
      window.cursorCheckTimeout = setTimeout(() => {
        checkCursorInHeading()
      }, 10)
    })
    
    // Listen for click events to immediately update
    editorContainer.addEventListener('click', () => {
      // Check cursor position immediately after click
      setTimeout(() => {
        checkCursorInHeading()
      }, 0)
    })
    
    // Initial check on load
    setTimeout(() => {
      checkCursorInHeading()
    }, 500)
  }
}

function checkCursorInHeading() {
  // Check if mouse is over the outline container
  if (outlineContainer && outlineContainer.dataset.mouseOver === 'true') {
    // Keep showing all tooltips
    showAllTooltips()
    return
  }
  
  // Try to get current active block
  const activeBlock = document.querySelector('.orca-active')
  if (activeBlock) {
    // Find closest heading block
    let headingBlock = findClosestHeading(activeBlock)
    
    if (headingBlock) {
      const headingId = headingBlock.dataset.id
      console.log('Heading block found for active content:', headingId)
      
      // Update nodes to show text for the current heading
      updateHeadingTooltips(headingId)
    } else {
      console.log('No heading block found for active content')
      // Hide all tooltips if no heading found
      hideAllTooltips()
    }
  } else {
    console.log('No active block found')
    // Hide all tooltips if no active block
    hideAllTooltips()
  }
}

function findClosestHeading(element) {
  // Check if current element is a heading
  if (element.dataset.type === 'heading') {
    return element
  }
  
  // First, look for heading in the same or parent containers
  let currentElement = element
  while (currentElement) {
    // Check all sibling elements first
    let sibling = currentElement.previousElementSibling
    while (sibling) {
      if (sibling.dataset.type === 'heading') {
        return sibling
      }
      sibling = sibling.previousElementSibling
    }
    
    // If no heading found in siblings, move up to parent
    currentElement = currentElement.parentElement
    
    // Check if parent is a heading
    if (currentElement && currentElement.dataset.type === 'heading') {
      return currentElement
    }
  }
  
  return null
}

function updateHeadingTooltips(activeHeadingId) {
  headingNodes.forEach(({ node, item }) => {
    const tooltip = node.querySelector('.orca-toc-tooltip')
    if (tooltip) {
      if (item.id === activeHeadingId) {
        // Show full text for current heading
        tooltip.textContent = `${item.text}`
        tooltip.style.opacity = '1'
        tooltip.style.visibility = 'visible'
        // Ensure tooltip stays visible by removing transition
        tooltip.style.transition = 'none'
        // Add a special class to mark active tooltip
        tooltip.classList.add('orca-toc-tooltip-active')
      } else {
        // Hide other tooltips
        tooltip.style.opacity = '0'
        tooltip.style.visibility = 'hidden'
        tooltip.classList.remove('orca-toc-tooltip-active')
      }
    }
  })
}

function hideAllTooltips() {
  headingNodes.forEach(({ node }) => {
    const tooltip = node.querySelector('.orca-toc-tooltip')
    if (tooltip) {
      tooltip.style.opacity = '0'
      tooltip.style.visibility = 'hidden'
      tooltip.classList.remove('orca-toc-tooltip-active')
    }
  })
}

async function unload(_pluginName) {
  console.log('ORCA-TOC plugin unloading...')
  
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  
  // Remove event listeners (if any)
  // No resize listener needed anymore
  
  if (outlineContainer) {
    outlineContainer.remove()
    outlineContainer = null
    headingNodes = []
  }
  
  console.log('ORCA-TOC plugin unloaded successfully')
}

export { load, unload }
