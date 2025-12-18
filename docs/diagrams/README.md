# Auto-Attendance Tracking System - Diagrams

This folder contains all technical diagrams for the project in both Mermaid (`.mmd`) and PNG formats.

## 📊 Available Diagrams

### 1. Class Diagram
**File:** `class-diagram.png` (319 KB)
- Shows the complete object-oriented architecture
- Includes Controllers, Services, Models, and Middleware layers
- Displays all relationships between classes

### 2. Data Flow Diagram (DFD)
**File:** `data-flow-diagram.png` (411 KB)
- Illustrates how data flows through the entire system
- Shows authentication, check-in/out, location tracking processes
- Includes all data stores and external services

### 3. Entity Relationship Diagram (ERD)
**File:** `er-diagram.png` (344 KB)
- Complete database schema with all entities
- Shows relationships with cardinality
- Includes all fields with data types and constraints

## 📥 How to Download

1. **Via File Explorer:**
   - Navigate to: `c:\Users\USER\Downloads\Auto-Attendance-Tracking\docs\diagrams\`
   - Copy the PNG files to your desired location

2. **Via VS Code:**
   - Right-click on any `.png` file in the Explorer
   - Select "Reveal in File Explorer"
   - Copy the files from there

## 🔧 Source Files

The `.mmd` files are Mermaid source files that can be:
- Edited in any text editor
- Rendered in VS Code with Mermaid extension
- Converted to other formats using `mmdc` CLI

### Regenerate PNGs

If you modify the `.mmd` files, regenerate PNGs with:

```powershell
cd docs/diagrams

# Class Diagram
mmdc -i class-diagram.mmd -o class-diagram.png -w 3000 -H 2000 -b white

# Data Flow Diagram
mmdc -i data-flow-diagram.mmd -o data-flow-diagram.png -w 3500 -H 2500 -b white

# Entity Relationship Diagram
mmdc -i er-diagram.mmd -o er-diagram.png -w 3000 -H 2500 -b white
```

## 📋 File List

```
diagrams/
├── class-diagram.mmd          # Mermaid source for Class Diagram
├── class-diagram.png          # Class Diagram PNG (3000x2000px)
├── data-flow-diagram.mmd      # Mermaid source for DFD
├── data-flow-diagram.png      # Data Flow Diagram PNG (3500x2500px)
├── er-diagram.mmd             # Mermaid source for ERD
├── er-diagram.png             # Entity Relationship Diagram PNG (3000x2500px)
└── README.md                  # This file
```

## 🖼️ Image Specifications

All PNG images are generated with:
- **Background:** White
- **Format:** PNG
- **Quality:** High resolution for documentation and presentations
- **Color:** Full color with styled elements

---

**Generated:** December 18, 2025  
**Tool:** Mermaid CLI (mmdc)  
**Project:** Auto-Attendance Tracking System
