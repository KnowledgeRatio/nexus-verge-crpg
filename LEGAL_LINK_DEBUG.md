# Legal Link Debugging Guide

## Issue
The "Legal / Licensing" footer link is not opening the legal modal when clicked on localhost.

## Debug Logging Added
I've added comprehensive console logging to help identify the issue. The logging will show:

1. **On page load** - Which elements were found during setup:
   ```
   Legal Modal Setup: {
     modal: 'Found' or 'NOT FOUND',
     closeBtn: 'Found' or 'NOT FOUND',
     footerLink: 'Found' or 'NOT FOUND'
   }
   ```

2. **When clicking the footer link**:
   ```
   Footer legal link clicked!
   ```

3. **When openLegal() is called**:
   ```
   openLegal called: {
     modal: 'Found' or 'NOT FOUND',
     hasActiveClass: true/false
   }
   Legal modal opened - active class added
   ```

## How to Test
1. Open the game in your browser (http://localhost:8000 or similar)
2. Open the browser console (F12 or right-click → Inspect → Console tab)
3. Look for the "Legal Modal Setup" message on page load
4. Click the "Legal / Licensing" link in the footer
5. Watch the console output

## Possible Issues & Solutions

### Issue 1: Elements Not Found During Setup
**Console shows**: `modal: 'NOT FOUND'` or `footerLink: 'NOT FOUND'`

**Cause**: The setupLegalModal() function is running before the DOM is fully loaded.

**Solution**: The setup is called in the constructor after DOMContentLoaded, so this shouldn't happen. But if it does, we need to move the setup call to happen later.

### Issue 2: Footer Link Click Not Registering
**Console shows**: "Legal Modal Setup" message, but no "Footer legal link clicked!" when clicking

**Cause**: Event listener not properly attached or footer link is being covered by another element.

**Solution**:
- Check if another element is covering the footer (use browser DevTools inspector)
- Check z-index values of overlapping elements
- Try adding `pointer-events: none` to elements that might be covering it

### Issue 3: Modal Element Not Found When Opening
**Console shows**: "Footer legal link clicked!" but then "Legal modal element not found!"

**Cause**: Modal element gets removed or hidden after setup.

**Solution**: Check if any code is removing or hiding the legalModal element after page load.

### Issue 4: Modal Not Displaying Despite Active Class
**Console shows**: All found, "active class added", but modal still not visible

**Cause**: CSS issue - either the modal is behind other elements or the .active class isn't properly styled.

**Solution**:
- Check if z-index of modal (10000) is high enough
- Verify `.modal.active` CSS rule exists and has `display: flex`
- Check for conflicting CSS rules

## Current Implementation Status

### HTML Structure ✅
- `#legalModal` exists in index.html (line 840)
- `#closeLegalBtn` exists (line 844)
- `#footerLegalLink` exists (line 986)
- Footer is outside all screen containers, at root level

### CSS Styling ✅
- `.modal` has `display: none` by default (line 1122)
- `.modal.active` has `display: flex` (line 1134)
- `.app-footer` has `z-index: 50` and proper positioning (line 5748)
- Footer is hidden only when `#gameScreen.active` (line 5762)

### JavaScript Handlers ✅
- setupLegalModal() is called in constructor (line 500)
- Event listener added to footerLink with preventDefault (line 2325)
- openLegal() adds 'active' class to modal (line 2362)
- closeLegal() removes 'active' class (line 2371)

## Expected Behavior
When everything works correctly:
1. Console shows all elements found during setup
2. Clicking footer link triggers console message
3. openLegal() is called and modal element is found
4. Active class is added
5. Modal appears over the page with dark backdrop
6. Clicking X or backdrop closes modal
7. ESC key closes modal

## Next Steps
1. Test with the debug logging enabled
2. Share the console output
3. Based on the output, we can identify which of the 4 issues above is occurring
4. Apply the appropriate fix

## Files Modified
- `src/main.js` - Added debug logging to setupLegalModal() and openLegal()
  - Lines 2312-2316: Setup logging
  - Line 2326: Footer click logging
  - Lines 2354-2363: Open modal logging
