for (p = 0; p < document.styleSheets.length; p++) {
	var currStyleSheet = document.styleSheets.item(p);
	var currCSSRules = currStyleSheet.cssRules;
	for (q = 0; currCSSRules && q < currCSSRules.length; q++) {
		var cssRule = currCSSRules[q];
		if (cssRule.type != CSSRule.STYLE_RULE)
			continue;
		//var m = cssRule.cssText.match(/^\s*(.*\*\s*(?:,.*)?)\s*\{([^}]+)\}\s*$/);	//Matching selectors such as "p *" or "div *, table td"
		var m = cssRule.cssText.match(/^\s*([^}]+)\s*\{([^}]+)\}\s*$/);
		if (m && m[2].match(/\bfont(-size)?\s*:/)) {    //Todo: only fix if font-size > 80% or < 50%
			var selectors = m[1].split(",");
			for (var x = 0; x < selectors.length; x++) {
				//if (selectors[x].match(/\*\s*$/)) {	//Matching selectors such as "p *", or "div *"
					currStyleSheet.insertRule(selectors[x] + " rt { font-size: 60%; }", q + 1);
					q++;
				//}
			}
		}
	}
}
