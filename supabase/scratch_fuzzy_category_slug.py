import os

fuzzy_normalize_func = """  const normalizeCategorySlug = (categoria: string): string => {
    const norm = categoria.toLowerCase().trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    if (norm.includes('calzone') || norm.includes('empanada')) {
      return 'calzones-y-empanadas';
    }
    if (norm.includes('pizza')) {
      return 'pizzas';
    }
    if (norm.includes('bebida') || norm.includes('bodega') || norm.includes('vino') || norm.includes('cerveza') || norm.includes('gaseosa')) {
      return 'bebidas';
    }
    if (norm.includes('postre') || norm.includes('dulce') || norm.includes('helado')) {
      return 'postres';
    }
    if (norm.includes('sandwich') || norm.includes('baguette') || norm.includes('lomo')) {
      return 'sandwiches';
    }
    return norm;
  };"""

# 1. Update MenuModule.tsx
if os.path.exists("src/components/MenuModule.tsx"):
    with open("src/components/MenuModule.tsx", "r", encoding="utf-8") as f:
        code = f.read()
    
    # We locate the normalizeCategorySlug in MenuModule.tsx
    # Find start and end of normalizeCategorySlug
    start_idx = code.find("  const normalizeCategorySlug = ")
    if start_idx != -1:
        # Find the end of the helper: const getCategorySlug = 
        end_idx = code.find("  const getCategorySlug = ")
        if end_idx != -1:
            code = code[:start_idx] + fuzzy_normalize_func + "\n\n" + code[end_idx:]
            print("MenuModule.tsx updated with fuzzy matching.")
            with open("src/components/MenuModule.tsx", "w", encoding="utf-8") as f:
                f.write(code)

# 2. Update useMozoTerminal.ts
if os.path.exists("src/features/salon/hooks/useMozoTerminal.ts"):
    with open("src/features/salon/hooks/useMozoTerminal.ts", "r", encoding="utf-8") as f:
        code = f.read()
    
    start_idx = code.find("      const normalizeCategorySlug = ")
    if start_idx != -1:
        end_idx = code.find("      const pSlug = normalizeCategorySlug")
        if end_idx != -1:
            # We need to indent the function for useMozoTerminal
            indented_fuzzy = "\n".join("    " + line for line in fuzzy_normalize_func.split("\n"))
            code = code[:start_idx] + indented_fuzzy + "\n" + code[end_idx:]
            print("useMozoTerminal.ts updated with fuzzy matching.")
            with open("src/features/salon/hooks/useMozoTerminal.ts", "w", encoding="utf-8") as f:
                f.write(code)

# 3. Update MozoTerminal.tsx
if os.path.exists("src/components/MozoTerminal.tsx"):
    with open("src/components/MozoTerminal.tsx", "r", encoding="utf-8") as f:
        code = f.read()
    
    start_idx = code.find("                    const normalizeCategorySlug = ")
    if start_idx != -1:
        end_idx = code.find("                    return normalizeCategorySlug")
        if end_idx != -1:
            # Indent
            indented_fuzzy = "\n".join("                    " + line.strip() for line in fuzzy_normalize_func.split("\n"))
            code = code[:start_idx] + indented_fuzzy + "\n" + code[end_idx:]
            print("MozoTerminal.tsx updated with fuzzy matching.")
            with open("src/components/MozoTerminal.tsx", "w", encoding="utf-8") as f:
                f.write(code)

print("Fuzzy matching updates completed!")
