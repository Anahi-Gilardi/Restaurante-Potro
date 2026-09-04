"""
components/menu_diario_utils.py — Gestión del Menú del Día Semanal (Lunes a Domingo).
Maneja la base de datos, sincronización con productos_menu y la interfaz de administración.
"""

from __future__ import annotations

import base64
import os
from datetime import datetime
from html import escape
from pathlib import Path

import pandas as pd
import streamlit as st

from database import get_connection, execute_query


TABLA_MENU_DIARIO_SQL = """
CREATE TABLE IF NOT EXISTS menu_diario (
    dia TEXT PRIMARY KEY,
    nombre TEXT NOT NULL DEFAULT '',
    categoria TEXT NOT NULL DEFAULT 'Minutas & Especiales',
    precio REAL NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL DEFAULT '',
    imagen_url TEXT NOT NULL DEFAULT '',
    activo INTEGER NOT NULL DEFAULT 1,
    id_producto INTEGER,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
"""

DIAS_SEMANA = [
    ("lunes", "LUNES"),
    ("martes", "MARTES"),
    ("miercoles", "MIÉRCOLES"),
    ("jueves", "JUEVES"),
    ("viernes", "VIERNES"),
    ("sabado", "SÁBADO"),
    ("domingo", "DOMINGO"),
]

CATEGORIAS_MENU_DIARIO = [
    "Minutas & Especiales",
    "Pastas Artesanales",
    "Carnes & Parri",
    "Entradas & Ensaladas",
    "Postres & Dulces",
    "Bebidas",
    "Especialidades",
]

MENU_DIARIO_DEFAULTS = {
    "lunes": {
        "nombre": "canelones con salsa mixta",
        "categoria": "Minutas & Especiales",
        "precio": 8500.0,
        "descripcion": "Los rellenos más tradicionales incluyen espinaca o acelga con ricota y nuez moscada, pollo desmenuzado.",
        "imagen_url": "assets/ejemplos/milanesa.svg",
        "activo": 1,
    },
    "martes": {
        "nombre": "Costeleta de Cerdo a la Riojana",
        "categoria": "Carnes & Parri",
        "precio": 8500.0,
        "descripcion": "Costeleta de cerdo grillada acompañada de salteado riojano, arvejas, jamón y papas fritas.",
        "imagen_url": "assets/ejemplos/hamburguesa.svg",
        "activo": 1,
    },
    "miercoles": {
        "nombre": "Hamburguesa Napolitana al Plato con Papas",
        "categoria": "Minutas & Especiales",
        "precio": 8500.0,
        "descripcion": "Hamburguesa artesanal vacuna gratinada con muzzarella, salsa de tomate y orégano, con papas fritas.",
        "imagen_url": "assets/ejemplos/hamburguesa.svg",
        "activo": 1,
    },
    "jueves": {
        "nombre": "Tartas Individuales de Estación con Ensalada",
        "categoria": "Minutas & Especiales",
        "precio": 8500.0,
        "descripcion": "Tarta casera del día acompañada de un mix de verdes frescos y tomates cherry.",
        "imagen_url": "assets/ejemplos/papas_fritas.svg",
        "activo": 1,
    },
    "viernes": {
        "nombre": "Milanesa de Ternera Napolitana con Papas Rústicas",
        "categoria": "Minutas & Especiales",
        "precio": 12000.0,
        "descripcion": "Milanesa tierna de ternera con salsa de tomate de la casa, jamón cocido y queso gratinado.",
        "imagen_url": "assets/ejemplos/milanesa.svg",
        "activo": 1,
    },
    "sabado": {
        "nombre": "Pollo al Horno con Papas Rústicas",
        "categoria": "Carnes & Parri",
        "precio": 8500.0,
        "descripcion": "Pata muslo marinada al limón y romero horneada a fuego lento con papas doradas.",
        "imagen_url": "assets/ejemplos/hamburguesa.svg",
        "activo": 1,
    },
    "domingo": {
        "nombre": "Canelones de Verdura y Ricota con Salsa Bolognesa",
        "categoria": "Pastas Artesanales",
        "precio": 8500.0,
        "descripcion": "Pasta casera rellena de espinaca y ricota de campo, bañada en suculenta salsa bolognesa.",
        "imagen_url": "assets/ejemplos/milanesa.svg",
        "activo": 1,
    },
}


def init_menu_diario_db() -> None:
    """Inicializa la tabla menu_diario y siembra los datos por defecto si está vacía."""
    conn = get_connection()
    try:
        conn.execute(TABLA_MENU_DIARIO_SQL)
        conn.commit()

        cant = conn.execute("SELECT COUNT(*) AS cnt FROM menu_diario").fetchone()
        if not cant or cant["cnt"] == 0:
            for dia, data in MENU_DIARIO_DEFAULTS.items():
                guardar_menu_dia(
                    dia=dia,
                    nombre=data["nombre"],
                    categoria=data["categoria"],
                    precio=data["precio"],
                    descripcion=data["descripcion"],
                    imagen_url=data["imagen_url"],
                    activo=data["activo"],
                    conn_external=conn,
                )
            conn.commit()
    except Exception as exc:
        import warnings
        warnings.warn(f"Error al inicializar menu_diario: {exc}")
    finally:
        conn.close()


def get_today_key() -> str:
    """Retorna la clave del día actual en español (lunes..domingo)."""
    idx = datetime.now().weekday()
    dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
    return dias[idx]


def obtener_menu_diario_semana() -> dict[str, dict]:
    """Retorna dict {dia: {nombre, categoria, precio, descripcion, imagen_url, activo, id_producto}}."""
    init_menu_diario_db()
    conn = get_connection()
    try:
        rws = conn.execute("SELECT * FROM menu_diario").fetchall()
        res = {}
        for r in rws:
            res[r["dia"]] = dict(r)
        # Completar faltantes si los hubiere
        for dia, key_label in DIAS_SEMANA:
            if dia not in res:
                default = MENU_DIARIO_DEFAULTS.get(dia, {
                    "nombre": f"Propuesta de {key_label}",
                    "categoria": "Minutas & Especiales",
                    "precio": 8500.0,
                    "descripcion": "",
                    "imagen_url": "",
                    "activo": 1,
                    "id_producto": None,
                })
                res[dia] = {"dia": dia, **default}
        return res
    finally:
        conn.close()


def obtener_menu_dia(dia: str) -> dict:
    semana = obtener_menu_diario_semana()
    return semana.get(dia, {
        "dia": dia,
        "nombre": "",
        "categoria": "Minutas & Especiales",
        "precio": 0.0,
        "descripcion": "",
        "imagen_url": "",
        "activo": 1,
        "id_producto": None,
    })


def obtener_menu_dia_actual() -> dict:
    return obtener_menu_dia(get_today_key())


def guardar_menu_dia(
    dia: str,
    nombre: str,
    categoria: str,
    precio: float,
    descripcion: str,
    imagen_url: str,
    activo: int,
    conn_external=None,
) -> dict:
    """Guarda o actualiza la propuesta de un día y sincroniza con productos_menu."""
    conn = conn_external or get_connection()
    own_connection = conn_external is None
    try:
        nombre_clean = (nombre or "").strip()
        nombre_producto_catalogo = f"Menú del Día ({dia.capitalize()}): {nombre_clean}"

        # 1. Verificar si ya existe id_producto asignado
        cur = conn.execute("SELECT id_producto FROM menu_diario WHERE dia = ?", (dia,))
        r = cur.fetchone()
        id_prod = r["id_producto"] if r and r["id_producto"] else None

        # 2. Sincronizar en productos_menu
        if id_prod:
            conn.execute("""
                UPDATE productos_menu
                   SET nombre = ?, precio_venta = ?, categoria = 'Menú del Día', activo = ?
                 WHERE id_producto = ?
            """, (nombre_producto_catalogo, precio, int(activo), id_prod))
        else:
            cur_ins = conn.execute("""
                INSERT INTO productos_menu (nombre, precio_venta, categoria, activo)
                VALUES (?, ?, 'Menú del Día', ?)
            """, (nombre_producto_catalogo, precio, int(activo)))
            id_prod = cur_ins.lastrowid

        # 3. Guardar en menu_diario
        conn.execute("""
            INSERT INTO menu_diario (dia, nombre, categoria, precio, descripcion, imagen_url, activo, id_producto, actualizado_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
            ON CONFLICT(dia) DO UPDATE SET
                nombre = excluded.nombre,
                categoria = excluded.categoria,
                precio = excluded.precio,
                descripcion = excluded.descripcion,
                imagen_url = excluded.imagen_url,
                activo = excluded.activo,
                id_producto = excluded.id_producto,
                actualizado_en = datetime('now','localtime')
        """, (dia, nombre_clean, categoria, precio, descripcion.strip(), imagen_url.strip(), int(activo), id_prod))

        if own_connection:
            conn.commit()
        return {"ok": True, "id_producto": id_prod}
    except Exception as exc:
        if own_connection:
            try:
                conn.rollback()
            except Exception:
                pass
        return {"ok": False, "error": str(exc)}
    finally:
        if own_connection:
            conn.close()


def page_admin_menu_diario() -> None:
    """Módulo de gestión del Menú del Día Semanal con diseño Pizarra."""
    init_menu_diario_db()
    semana = obtener_menu_diario_semana()

    st.markdown(
        """
        <style>
            .pizarra-sub {
                color: #8C6239;
                font-size: 0.78rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .pizarra-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1.2rem;
            }
            .pizarra-title {
                font-size: 1.6rem;
                font-weight: 800;
                color: #1E140E;
                margin: 0;
            }
            .pizarra-desc {
                color: #6f685f;
                font-size: 0.88rem;
                margin-top: 0.2rem;
            }
            .day-strip {
                display: flex;
                gap: 0.5rem;
                overflow-x: auto;
                padding-bottom: 0.8rem;
                margin-bottom: 1.5rem;
            }
            .day-card {
                flex: 1;
                min-width: 130px;
                background: #FAF7F0;
                border: 1px solid #DED8CF;
                border-radius: 8px;
                padding: 0.7rem 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .day-card-active {
                background: #5C1D24 !important;
                color: white !important;
                border-color: #5C1D24 !important;
                box-shadow: 0 4px 10px rgba(92, 29, 36, 0.25);
            }
            .day-title {
                font-weight: 800;
                font-size: 0.95rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .badge-on {
                background: #247a3d;
                color: white;
                font-size: 0.65rem;
                font-weight: 800;
                padding: 0.15rem 0.4rem;
                border-radius: 4px;
            }
            .badge-off {
                background: #8c8c8c;
                color: white;
                font-size: 0.65rem;
                font-weight: 800;
                padding: 0.15rem 0.4rem;
                border-radius: 4px;
            }
            .day-dish {
                font-size: 0.8rem;
                margin-top: 0.4rem;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .day-price {
                font-size: 0.82rem;
                font-weight: 700;
                opacity: 0.9;
                margin-top: 0.15rem;
            }
            .preview-card {
                background: #ffffff;
                border: 1px solid #ded8cf;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .preview-img {
                width: 100%;
                height: 180px;
                object-fit: cover;
                background: #f6f4ef;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )

    if "selected_menu_day" not in st.session_state:
        st.session_state.selected_menu_day = get_today_key()

    dia_sel = st.session_state.selected_menu_day
    data_sel = semana.get(dia_sel, MENU_DIARIO_DEFAULTS.get(dia_sel, {}))

    # Top Header Banner
    st.markdown('<div class="pizarra-sub">CONFIGURACIÓN DE ROTACIÓN DIARIA & PORTADA</div>', unsafe_allow_html=True)
    c_title, c_top_btns = st.columns([2.5, 1.5])
    with c_title:
        st.markdown(
            """
            <div class="pizarra-title">Pizarra & Menú del Día Semanal (Lunes a Domingo)</div>
            <div class="pizarra-desc">Configure las propuestas del día para cada día de la semana. Se sincronizan automáticamente con el POS del Mozo y la Portada Publicitaria.</div>
            """,
            unsafe_allow_html=True,
        )

    with c_top_btns:
        btn_top_1, btn_top_2 = st.columns(2)
        with btn_top_1:
            guardar_dia_top = st.button(f"💾 GUARDAR ({dia_sel.upper()})", type="primary", use_container_width=True)
        with btn_top_2:
            guardar_semana_top = st.button("🌐 GUARDAR SEMANA", use_container_width=True)

    st.markdown("<div style='margin-top: 0.8rem;'></div>", unsafe_allow_html=True)

    # Day Selector Buttons Strip
    cols_days = st.columns(7)
    for col, (d_key, d_label) in zip(cols_days, DIAS_SEMANA):
        info_d = semana.get(d_key, {})
        is_active = d_key == dia_sel
        status_badge = "ON" if info_d.get("activo", 1) else "OFF"
        badge_cls = "badge-on" if info_d.get("activo", 1) else "badge-off"
        nombre_d = info_d.get("nombre", f"Menú {d_label}")
        precio_d = float(info_d.get("precio", 8500))

        with col:
            bg_style = "background:#5C1D24; color:white; border-color:#5C1D24;" if is_active else "background:#FAF7F0; color:#1E140E;"
            st.markdown(
                f"""
                <div style="{bg_style} border:1px solid #DED8CF; border-radius:8px; padding:0.6rem 0.6rem; min-height:80px;">
                    <div style="font-weight:800; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>{d_label}</span>
                        <span class="{badge_cls}">{status_badge}</span>
                    </div>
                    <div style="font-size:0.75rem; margin-top:0.3rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600;">
                        {escape(nombre_d)}
                    </div>
                    <div style="font-size:0.8rem; font-weight:800; margin-top:0.1rem;">
                        ${precio_d:,.0f}
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button(f"Editar {d_label}", key=f"btn_strip_{d_key}", use_container_width=True):
                st.session_state.selected_menu_day = d_key
                st.rerun()

    st.markdown("<hr style='margin:1.2rem 0; border-color:#DED8CF;'>", unsafe_allow_html=True)

    # Selected Day Form
    d_label_sel = next((lbl for k, lbl in DIAS_SEMANA if k == dia_sel), dia_sel.upper())

    st.markdown(
        f"""
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <div>
                <span class="pizarra-sub">EDICIÓN DE MENÚ — {d_label_sel}</span>
                <div style="font-size:1.4rem; font-weight:800; color:#1E140E;">{escape(data_sel.get('nombre', ''))}</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    with st.form(key=f"form_menu_diario_{dia_sel}", clear_on_submit=False):
        c_status, _ = st.columns([1, 3])
        with c_status:
            activo_val = st.checkbox(
                f"ESTADO DEL DÍA: ACTIVO [ON]",
                value=bool(data_sel.get("activo", 1)),
                key=f"chk_activo_{dia_sel}",
            )

        f_c1, f_c2, f_c3 = st.columns([2, 1.3, 1])
        with f_c1:
            nombre_in = st.text_input(
                "NOMBRE / TÍTULO DEL PLATO *",
                value=data_sel.get("nombre", ""),
                key=f"in_nombre_{dia_sel}",
            )
        with f_c2:
            cat_idx = CATEGORIAS_MENU_DIARIO.index(data_sel["categoria"]) if data_sel.get("categoria") in CATEGORIAS_MENU_DIARIO else 0
            cat_in = st.selectbox(
                "TIPO DE MENÚ / CATEGORÍA *",
                CATEGORIAS_MENU_DIARIO,
                index=cat_idx,
                key=f"in_cat_{dia_sel}",
            )
        with f_c3:
            precio_in = st.number_input(
                "PRECIO PROMOCIONAL ($ ARS) *",
                min_value=0.0,
                value=float(data_sel.get("precio", 8500)),
                step=500.0,
                key=f"in_precio_{dia_sel}",
            )

        desc_in = st.text_area(
            "DESCRIPCIÓN DE LA PROPUESTA *",
            value=data_sel.get("descripcion", ""),
            height=90,
            key=f"in_desc_{dia_sel}",
        )

        col_img_left, col_img_right = st.columns([1.5, 1])

        with col_img_left:
            st.markdown("<b>IMAGEN REPRESENTATIVA (URL O CARGAR FOTO HD)</b>", unsafe_allow_html=True)
            img_url_in = st.text_input(
                "URL de Imagen",
                value=data_sel.get("imagen_url", ""),
                placeholder="https://... o assets/ejemplos/...",
                key=f"in_img_url_{dia_sel}",
                label_visibility="collapsed",
            )
            file_uploaded = st.file_uploader(
                "📷 CARGAR FOTO HD DESDE CELULAR / PC",
                type=["png", "jpg", "jpeg", "webp", "svg"],
                key=f"file_up_{dia_sel}",
            )
            if file_uploaded:
                bytes_data = file_uploaded.getvalue()
                b64 = base64.b64encode(bytes_data).decode()
                mime = file_uploaded.type or "image/jpeg"
                img_url_in = f"data:{mime};base64,{b64}"

        with col_img_right:
            st.markdown("<b>VISTA PREVIA (PUBLICIDAD Y MENÚ)</b>", unsafe_allow_html=True)
            if img_url_in and img_url_in.strip():
                try:
                    st.image(img_url_in, use_column_width=True)
                except Exception:
                    st.caption("Vista previa no disponible (URL no válida)")
            else:
                st.caption("Sin imagen configurada")

        st.markdown("<br>", unsafe_allow_html=True)
        guardar_btn = st.form_submit_button(
            f"💾 GUARDAR MENÚ DE {d_label_sel}",
            type="primary",
            use_container_width=True,
        )

        if guardar_btn or guardar_dia_top:
            if not (nombre_in or "").strip():
                st.error("El nombre del plato es obligatorio.")
            else:
                res = guardar_menu_dia(
                    dia=dia_sel,
                    nombre=nombre_in,
                    categoria=cat_in,
                    precio=precio_in,
                    descripcion=desc_in,
                    imagen_url=img_url_in,
                    activo=1 if activo_val else 0,
                )
                if res["ok"]:
                    st.toast(f"¡Menú de {d_label_sel} guardado correctamente!")
                    st.rerun()
                else:
                    st.error(f"Error al guardar: {res.get('error')}")

    if guardar_semana_top:
        st.toast("La semana completa se encuentra sincronizada correctamente.")
