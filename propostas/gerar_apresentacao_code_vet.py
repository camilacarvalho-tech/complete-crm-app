#!/usr/bin/env python3
"""
CODE VET — Apresentação aprimorada (com imagens nas cores CODE).
Informações de contato / rodapé apenas na CAPA (e CTA final).
"""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt, Emu

# ── Brand CODE ────────────────────────────────────────────────────
BG = RGBColor(0x0A, 0x0E, 0x1A)
BG_CARD = RGBColor(0x11, 0x16, 0x27)
BG_ALT = RGBColor(0x15, 0x1B, 0x2E)
TEAL = RGBColor(0x14, 0xB8, 0xA6)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
PURPLE = RGBColor(0x8B, 0x5C, 0xF6)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SLATE_200 = RGBColor(0xE5, 0xE7, 0xEB)
SLATE_300 = RGBColor(0xD1, 0xD5, 0xDB)
SLATE_400 = RGBColor(0x9C, 0xA3, 0xAF)
SLATE_500 = RGBColor(0x6B, 0x72, 0x80)
GREEN = RGBColor(0x34, 0xD3, 0x99)
RED = RGBColor(0xF8, 0x71, 0x71)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

ASSETS = Path(__file__).resolve().parent / "assets_code_vet"
OUT_DIR = Path(__file__).resolve().parent
OUT_FILE = OUT_DIR / "CODE_VET_Apresentacao_CRM_SaaS_Clinicas_Veterinarias.pptx"
ARTIFACT = Path("/opt/cursor/artifacts") / OUT_FILE.name
ARTIFACT_SHORT = Path("/opt/cursor/artifacts") / "CODE_VET_Apresentacao.pptx"


def font(run, size, color, bold=False, name="Calibri"):
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = name


def fill(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def rect(slide, l, t, w, h, color):
    sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    fill(sh, color)
    return sh


def rrect(slide, l, t, w, h, color, adj=0.08):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    fill(sh, color)
    try:
        sh.adjustments[0] = adj
    except Exception:
        pass
    return sh


def txt(slide, l, t, w, h, text, size=18, color=WHITE, bold=False, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    font(run, size, color, bold)
    return box


def multi(slide, l, t, w, h, lines, size=13, color=SLATE_300, spacing=6, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        if isinstance(line, tuple):
            text, c, b, sz = line[0], line[1] if len(line) > 1 else color, line[2] if len(line) > 2 else False, line[3] if len(line) > 3 else size
        else:
            text, c, b, sz = line, color, False, size
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.space_after = Pt(spacing)
        run = p.add_run()
        run.text = text
        font(run, sz, c, b)
    return box


def img(slide, path: Path, l, t, w, h):
    if path.exists():
        return slide.shapes.add_picture(str(path), l, t, width=w, height=h)
    return None


def new_slide(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    rect(s, 0, 0, SLIDE_W, SLIDE_H, BG)
    # subtle left accent only (no footer info)
    rect(s, 0, 0, Inches(0.08), SLIDE_H, TEAL)
    return s


def title_block(slide, title, subtitle=None):
    rect(slide, Inches(0.55), Inches(0.38), Inches(0.1), Inches(0.42), TEAL)
    txt(slide, Inches(0.85), Inches(0.3), Inches(11.8), Inches(0.5), title, 26, WHITE, True)
    if subtitle:
        txt(slide, Inches(0.85), Inches(0.78), Inches(11.8), Inches(0.32), subtitle, 12, SLATE_400)


def pill(slide, l, t, w, h, text, bg=TEAL, fg=BG, size=11):
    sh = rrect(slide, l, t, w, h, bg, 0.5)
    tf = sh.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = text
    font(run, size, fg, True)
    return sh


# ══════════════════════════════════════════════════════════════════
# SLIDES
# ══════════════════════════════════════════════════════════════════

def slide_capa(prs):
    """Único slide com rodapé / informações de contato completas."""
    s = prs.slides.add_slide(prs.slide_layouts[6])
    # Full-bleed CODE visual
    img(s, ASSETS / "cover_hero.png", 0, 0, SLIDE_W, SLIDE_H)
    rect(s, 0, 0, Inches(0.12), SLIDE_H, TEAL)
    rect(s, 0, 0, SLIDE_W, Inches(0.08), TEAL)

    # Soft dark overlay on left for readability
    rect(s, 0, 0, Inches(7.8), SLIDE_H, BG)

    txt(s, Inches(0.9), Inches(0.85), Inches(6.5), Inches(0.35),
        "CODE Tecnologia Empresarial", 13, SLATE_400)
    pill(s, Inches(0.9), Inches(1.35), Inches(2.6), Inches(0.38), "CODE VET  ·  SaaS")

    txt(s, Inches(0.9), Inches(2.05), Inches(7), Inches(0.7), "CODE VET", 48, WHITE, True)
    txt(s, Inches(0.9), Inches(2.8), Inches(7), Inches(0.55),
        "Plataforma Inteligente para\nClínicas Veterinárias", 22, TEAL)
    txt(s, Inches(0.9), Inches(4.0), Inches(6.8), Inches(0.4),
        "CRM  ·  ERP  ·  Inteligência Artificial  ·  Automação  ·  BI", 13, SLATE_300)

    # RODAPÉ / INFO — somente na capa
    rect(s, 0, Inches(5.45), SLIDE_W, Inches(2.05), BG_CARD)
    rect(s, 0, Inches(5.45), SLIDE_W, Inches(0.06), TEAL)
    txt(s, Inches(0.9), Inches(5.7), Inches(6), Inches(0.28), "Apresentado por", 11, SLATE_500)
    txt(s, Inches(0.9), Inches(6.0), Inches(7), Inches(0.38), "Camila Carvalho", 20, WHITE, True)
    txt(s, Inches(0.9), Inches(6.4), Inches(8), Inches(0.28),
        "Bacharel em Ciência de Dados  ·  CODE Tecnologia Empresarial", 12, SLATE_400)
    txt(s, Inches(0.9), Inches(6.8), Inches(8), Inches(0.28),
        "🌐  codetechoficial.com.br     📞  (14) 99690-2902", 13, TEAL)

    txt(s, Inches(9.3), Inches(6.15), Inches(3.5), Inches(0.7),
        "Apresentação Comercial\nProduto SaaS Veterinária", 12, SLATE_400, False, PP_ALIGN.RIGHT)


def slide_quem(prs):
    s = new_slide(prs)
    title_block(s, "Quem é a CODE",
                "Plataformas SaaS modernas para automatizar, reduzir custos e aumentar produtividade")

    img(s, ASSETS / "tech_panel.png", Inches(0.5), Inches(1.25), Inches(4.3), Inches(5.6))

    txt(s, Inches(5.2), Inches(1.35), Inches(7.5), Inches(1.3),
        "A CODE Tecnologia Empresarial desenvolve plataformas SaaS modernas "
        "para empresas que desejam automatizar processos, reduzir custos e "
        "aumentar a produtividade.", 14, SLATE_300)

    specs = [
        ("CRM", TEAL), ("ERP", BLUE), ("Inteligência Artificial", PURPLE),
        ("Ciência de Dados", AMBER), ("Desenvolvimento Web", TEAL),
        ("Aplicativos", BLUE), ("Dashboards", GREEN), ("Cloud", PURPLE),
    ]
    for i, (lab, col) in enumerate(specs):
        c, r = i % 2, i // 2
        x = Inches(5.2) + c * Inches(3.75)
        y = Inches(2.9) + r * Inches(0.9)
        rrect(s, x, y, Inches(3.55), Inches(0.75), BG_CARD, 0.12)
        rect(s, x, y, Inches(0.08), Inches(0.75), col)
        txt(s, x + Inches(0.3), y + Inches(0.18), Inches(3.1), Inches(0.4), lab, 14, WHITE, True)


def slide_desafio(prs):
    s = new_slide(prs)
    title_block(s, "O desafio das clínicas veterinárias",
                "Operação intensa, canais fragmentados e perda de receita")

    img(s, ASSETS / "challenge_visual.png", Inches(0.4), Inches(1.2), Inches(12.5), Inches(2.35))

    pains = [
        "Agenda manual", "WhatsApp sobrecarregado", "Prontuários em papel",
        "Financeiro descentralizado", "Estoque difícil", "Vacinas sem acompanhamento",
        "Consultas esquecidas", "Falta de indicadores", "Processos repetitivos", "Perda de receita",
    ]
    for i, lab in enumerate(pains):
        c, r = i % 5, i // 5
        x = Inches(0.5) + c * Inches(2.5)
        y = Inches(3.85) + r * Inches(1.4)
        rrect(s, x, y, Inches(2.35), Inches(1.2), BG_CARD, 0.12)
        rect(s, x, y, Inches(2.35), Inches(0.08), RED if i % 2 == 0 else AMBER)
        txt(s, x + Inches(0.15), y + Inches(0.35), Inches(2.05), Inches(0.6),
            f"⚠  {lab}", 12, SLATE_200, True, PP_ALIGN.CENTER)


def slide_solucao(prs):
    s = new_slide(prs)
    title_block(s, "Nossa solução — CODE VET SaaS",
                "Uma plataforma completa para administrar toda a clínica em um único lugar")

    txt(s, Inches(0.7), Inches(1.25), Inches(12), Inches(0.35),
        "Integração entre todos os setores. Um sistema. Uma operação. Uma visão.", 14, SLATE_300)

    img(s, ASSETS / "modules_grid.png", Inches(0.55), Inches(1.8), Inches(12.2), Inches(4.9))


def slide_dashboard(prs):
    s = new_slide(prs)
    title_block(s, "Dashboard Inteligente",
                "Indicadores em tempo real para decisões rápidas e gestão baseada em dados")
    img(s, ASSETS / "dashboard_mock.png", Inches(0.7), Inches(1.25), Inches(11.9), Inches(5.7))


def slide_crm(prs):
    s = new_slide(prs)
    title_block(s, "CRM Veterinário — o coração do sistema",
                "Cadastro completo de tutores, pets e histórico clínico-financeiro")
    img(s, ASSETS / "crm_triad.png", Inches(0.55), Inches(1.2), Inches(12.2), Inches(5.7))


def slide_agenda(prs):
    s = new_slide(prs)
    title_block(s, "Agenda Inteligente",
                "Organização por profissional, sala e procedimento — com automações")

    img(s, ASSETS / "agenda_visual.png", Inches(0.5), Inches(1.2), Inches(8.0), Inches(5.7))

    items = [
        ("Por médico veterinário", TEAL),
        ("Por sala", BLUE),
        ("Por procedimento", PURPLE),
        ("Confirmação automática", GREEN),
        ("Lembretes", AMBER),
        ("Reagendamento", TEAL),
        ("Fila de espera", BLUE),
        ("Google Calendar", PURPLE),
    ]
    for i, (lab, col) in enumerate(items):
        y = Inches(1.25) + i * Inches(0.68)
        rrect(s, Inches(8.8), y, Inches(4.0), Inches(0.6), BG_CARD, 0.15)
        rect(s, Inches(8.8), y, Inches(0.08), Inches(0.6), col)
        txt(s, Inches(9.1), y + Inches(0.12), Inches(3.5), Inches(0.35), lab, 13, WHITE, True)


def slide_prontuario(prs):
    s = new_slide(prs)
    title_block(s, "Prontuário Digital",
                "Registro clínico completo, seguro e acessível em qualquer momento")
    img(s, ASSETS / "prontuario_visual.png", Inches(0.5), Inches(1.2), Inches(12.3), Inches(5.7))


def slide_financeiro(prs):
    s = new_slide(prs)
    title_block(s, "Financeiro",
                "Controle completo do caixa, faturamento, comissões e indicadores")
    img(s, ASSETS / "finance_visual.png", Inches(0.45), Inches(1.15), Inches(8.2), Inches(5.8))

    items = [
        "Contas a pagar / receber", "Fluxo de caixa", "Mensalidades & Convênios",
        "PIX · Cartão · Boletos", "NF-e · DRE", "Comissões & Relatórios",
    ]
    for i, lab in enumerate(items):
        y = Inches(1.3) + i * Inches(0.9)
        rrect(s, Inches(8.95), y, Inches(3.9), Inches(0.8), BG_CARD, 0.12)
        rect(s, Inches(8.95), y, Inches(0.08), Inches(0.8), [TEAL, BLUE, AMBER, PURPLE, GREEN, TEAL][i])
        txt(s, Inches(9.25), y + Inches(0.2), Inches(3.4), Inches(0.4), lab, 13, WHITE, True)


def slide_estoque(prs):
    s = new_slide(prs)
    title_block(s, "Estoque Inteligente",
                "Controle de insumos críticos com validade, lote e reposição automática")
    img(s, ASSETS / "estoque_visual.png", Inches(0.5), Inches(1.2), Inches(12.3), Inches(5.7))


def slide_ia(prs):
    s = new_slide(prs)
    title_block(s, "Inteligência Artificial — CODE AI",
                "Automação inteligente para atendimento, operação e crescimento")

    img(s, ASSETS / "ai_network.png", Inches(0.5), Inches(1.2), Inches(7.2), Inches(5.6))

    abilities = [
        "Responder clientes", "Triagem inicial", "Agendar consultas",
        "Responder WhatsApp", "Analisar indicadores", "Criar campanhas",
        "Enviar lembretes", "Prever demanda", "Gerar relatórios",
    ]
    for i, lab in enumerate(abilities):
        y = Inches(1.25) + i * Inches(0.58)
        rrect(s, Inches(8.0), y, Inches(4.7), Inches(0.52), BG_CARD, 0.15)
        rect(s, Inches(8.0), y, Inches(0.08), Inches(0.52), [TEAL, BLUE, PURPLE, AMBER, GREEN][i % 5])
        txt(s, Inches(8.3), y + Inches(0.08), Inches(4.2), Inches(0.35), f"AI  ·  {lab}", 12, SLATE_200)


def slide_automacoes(prs):
    s = new_slide(prs)
    title_block(s, "Automações",
                "Comunicação e marketing contínuos sem retrabalho da equipe")
    img(s, ASSETS / "auto_visual.png", Inches(0.45), Inches(1.2), Inches(12.4), Inches(4.2))

    tags = [
        "Lembrete de vacina", "Lembrete de retorno", "Aniversário do Pet",
        "Pesquisa de satisfação", "Cobranças", "Remarketing",
    ]
    for i, lab in enumerate(tags):
        c, r = i % 3, i // 3
        x = Inches(0.55) + c * Inches(4.2)
        y = Inches(5.6) + r * Inches(0.7)
        rrect(s, x, y, Inches(4.0), Inches(0.6), BG_CARD, 0.15)
        rect(s, x, y, Inches(0.08), Inches(0.6), [TEAL, BLUE, AMBER, PURPLE, GREEN, TEAL][i])
        txt(s, x + Inches(0.25), y + Inches(0.12), Inches(3.5), Inches(0.35), lab, 12, SLATE_200, True)


def slide_app(prs):
    s = new_slide(prs)
    title_block(s, "Aplicativo Mobile",
                "Experiência digital para a clínica e para o tutor")

    img(s, ASSETS / "phone_mock.png", Inches(0.7), Inches(1.15), Inches(3.4), Inches(5.9))

    rights = [
        ("Carteira Digital do Pet", "Histórico vacinal e documentos sempre à mão", TEAL),
        ("Agendamento online", "Marque e remarque com poucos toques", BLUE),
        ("Chat & Notificações", "Comunicação direta com a clínica", PURPLE),
        ("Exames e Receitas", "Acesso rápido a resultados e prescrições", AMBER),
        ("Vacinas", "Acompanhamento e lembretes automáticos", GREEN),
    ]
    for i, (title, desc, col) in enumerate(rights):
        y = Inches(1.25) + i * Inches(1.05)
        rrect(s, Inches(4.5), y, Inches(8.2), Inches(0.95), BG_CARD, 0.1)
        rect(s, Inches(4.5), y, Inches(0.1), Inches(0.95), col)
        rrect(s, Inches(4.85), y + Inches(0.2), Inches(0.55), Inches(0.55), col, 0.25)
        txt(s, Inches(5.65), y + Inches(0.15), Inches(6.7), Inches(0.35), title, 15, WHITE, True)
        txt(s, Inches(5.65), y + Inches(0.5), Inches(6.7), Inches(0.3), desc, 12, SLATE_400)


def slide_beneficios(prs):
    s = new_slide(prs)
    title_block(s, "Benefícios",
                "Resultados práticos na operação, no atendimento e no faturamento")
    img(s, ASSETS / "benefits.png", Inches(0.55), Inches(1.2), Inches(12.2), Inches(3.5))

    extras = [
        "Redução de custos", "Mais produtividade", "Menos retrabalho",
        "Atendimento rápido", "Gestão completa", "Segurança dos dados",
    ]
    for i, lab in enumerate(extras):
        c, r = i % 3, i // 3
        x = Inches(0.55) + c * Inches(4.2)
        y = Inches(5.0) + r * Inches(0.9)
        rrect(s, x, y, Inches(4.0), Inches(0.75), BG_CARD, 0.12)
        rect(s, x, y, Inches(0.08), Inches(0.75), TEAL if i % 2 == 0 else BLUE)
        txt(s, x + Inches(0.3), y + Inches(0.18), Inches(3.5), Inches(0.4), f"★  {lab}", 13, WHITE, True)


def slide_roteiro(prs):
    s = new_slide(prs)
    title_block(s, "Roteiro do Projeto",
                "Do levantamento de requisitos à implantação e suporte contínuo")

    img(s, ASSETS / "roadmap.png", Inches(0.5), Inches(1.2), Inches(12.3), Inches(2.0))

    phases = [
        ("Fase 1", "Descoberta", "Levantamento\nProtótipos UI/UX\nAprovação do fluxo", TEAL),
        ("Fase 2", "Core CRM", "CRM + Agenda\nTutores e pets\nProntuário digital", BLUE),
        ("Fase 3", "Gestão", "Financeiro\nEstoque\nDashboard / BI", PURPLE),
        ("Fase 4", "Inteligência", "CODE AI\nWhatsApp\nAutomações + App", AMBER),
        ("Fase 5", "Go-Live", "Testes\nImplantação\nTreinamento + Suporte", GREEN),
    ]
    for i, (phase, title, body, col) in enumerate(phases):
        x = Inches(0.45) + i * Inches(2.55)
        rrect(s, x, Inches(3.5), Inches(2.4), Inches(3.35), BG_CARD, 0.08)
        rect(s, x, Inches(3.5), Inches(2.4), Inches(0.1), col)
        txt(s, x + Inches(0.15), Inches(3.75), Inches(2.1), Inches(0.3), phase, 11, col, True)
        txt(s, x + Inches(0.15), Inches(4.1), Inches(2.1), Inches(0.35), title, 14, WHITE, True)
        txt(s, x + Inches(0.15), Inches(4.6), Inches(2.1), Inches(2.0), body, 12, SLATE_300)


def slide_cta(prs):
    """CTA com contatos — fechamento (espelha a capa)."""
    s = new_slide(prs)
    img(s, ASSETS / "cover_hero.png", 0, 0, SLIDE_W, SLIDE_H)
    # dark overlay for readability
    rect(s, Inches(1.5), Inches(1.0), Inches(10.3), Inches(5.3), BG_CARD)
    rect(s, Inches(1.5), Inches(1.0), Inches(10.3), Inches(0.08), TEAL)

    pill(s, Inches(4.55), Inches(1.4), Inches(4.2), Inches(0.4),
         "VAMOS TRANSFORMAR SUA CLÍNICA?")

    txt(s, Inches(1.8), Inches(2.1), Inches(9.7), Inches(0.55),
        "CODE Tecnologia Empresarial", 28, WHITE, True, PP_ALIGN.CENTER)
    txt(s, Inches(1.8), Inches(2.7), Inches(9.7), Inches(0.4),
        "Tecnologia que impulsiona empresas.", 16, TEAL, False, PP_ALIGN.CENTER)
    txt(s, Inches(1.8), Inches(3.2), Inches(9.7), Inches(0.35),
        "CRM  ·  ERP  ·  IA  ·  Automação  ·  App  ·  Business Intelligence",
        12, SLATE_400, False, PP_ALIGN.CENTER)

    contacts = [
        ("Site", "codetechoficial.com.br"),
        ("WhatsApp", "(14) 99690-2902"),
        ("Apresentação", "Camila Carvalho"),
    ]
    for i, (lab, val) in enumerate(contacts):
        x = Inches(2.1) + i * Inches(3.2)
        rrect(s, x, Inches(3.9), Inches(2.95), Inches(1.35), BG_ALT, 0.12)
        txt(s, x + Inches(0.1), Inches(4.1), Inches(2.75), Inches(0.3), lab, 11, TEAL, True, PP_ALIGN.CENTER)
        txt(s, x + Inches(0.1), Inches(4.55), Inches(2.75), Inches(0.45), val, 13, WHITE, True, PP_ALIGN.CENTER)

    txt(s, Inches(1.8), Inches(5.5), Inches(9.7), Inches(0.5),
        "Bacharel em Ciência de Dados  ·  Não entregamos apenas um sistema —\n"
        "entregamos uma plataforma SaaS completa para gestão veterinária.",
        12, SLATE_400, False, PP_ALIGN.CENTER)


def build():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    slide_capa(prs)         # 1 — único com rodapé/info completa
    slide_quem(prs)         # 2
    slide_desafio(prs)      # 3
    slide_solucao(prs)      # 4
    slide_dashboard(prs)    # 5
    slide_crm(prs)          # 6
    slide_agenda(prs)       # 7
    slide_prontuario(prs)   # 8
    slide_financeiro(prs)   # 9
    slide_estoque(prs)      # 10
    slide_ia(prs)           # 11
    slide_automacoes(prs)   # 12
    slide_app(prs)          # 13
    slide_beneficios(prs)   # 14
    slide_roteiro(prs)      # 15
    slide_cta(prs)          # 16 — fechamento com contatos

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    prs.save(str(OUT_FILE))
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(ARTIFACT))
    prs.save(str(ARTIFACT_SHORT))
    print(f"Saved: {OUT_FILE}")
    print(f"Slides: {len(prs.slides)}")
    print(f"Assets: {ASSETS}")


if __name__ == "__main__":
    build()
