#!/usr/bin/env python3
"""IRS Form 1040 (2025) - Pixel-perfect match to official form"""
import sys, json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors

W, H = letter
LM = 0.3*inch
RM = W - 0.3*inch
GRAY  = colors.Color(0.82,0.82,0.82)
LGRAY = colors.Color(0.93,0.93,0.93)
WHITE = colors.white
BLACK = colors.black

def money(v):
    if not v: return ""
    try: n=float(v); return "" if n==0 else f"{n:,.0f}"
    except: return ""

def ssn_fmt(s):
    if not s: return ""
    d=str(s).replace("-","").replace(" ","")
    return f"{d[:3]}-{d[3:5]}-{d[5:9]}" if len(d)>=9 else s

def hl(c,x1,y,x2,w=0.4): c.setLineWidth(w); c.line(x1,y,x2,y)
def vl(c,x,y1,y2,w=0.4): c.setLineWidth(w); c.line(x,y1,x,y2)
def rect(c,x,y,w,h,fill=None,lw=0.4):
    c.setLineWidth(lw)
    if fill: c.setFillColor(fill); c.rect(x,y,w,h,fill=1,stroke=1); c.setFillColor(BLACK)
    else: c.rect(x,y,w,h,fill=0,stroke=1)
def t(c,x,y,text,sz=7,bold=False,right=False):
    if not str(text).strip(): return
    c.setFont("Helvetica-Bold" if bold else "Helvetica",sz)
    if right: c.drawRightString(x,y,str(text))
    else: c.drawString(x,y,str(text))
def dots(c,x1,y,x2):
    c.setLineWidth(0.3); c.setDash([1,3]); c.line(x1,y,x2,y); c.setDash([])

def generate(data,out):
    c=canvas.Canvas(out,pagesize=letter)
    c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0); c.setFillColor(BLACK)
    page1(c,data)
    c.showPage()
    c.setFillColor(WHITE); c.rect(0,0,W,H,fill=1,stroke=0); c.setFillColor(BLACK)
    page2(c,data)
    c.showPage()
    c.save()

def page1(c,data):
    f=data.get('f1040',{}); income=data.get('income',{})
    y=H-0.22*inch

    # ═══════════════════════════════════════
    # ROW 1: HEADER  Form | Dept/Title | 20|25 | OMB | IRS Use Only
    # ═══════════════════════════════════════
    HDR=0.48*inch

    # Draw outer border of entire header — thick
    DX=LM+0.5*inch
    YX=DX+3.25*inch
    OX=YX+0.75*inch

    # Outer border — 3 sides only (no top border)
    c.setLineWidth(1.2)
    c.line(LM, y-HDR, RM, y-HDR)   # bottom
    c.line(LM, y, LM, y-HDR)        # left
    c.line(RM, y, RM, y-HDR)        # right

    # Internal column dividers — thin
    c.setLineWidth(0.4)
    c.line(DX, y, DX, y-HDR)           # Form | Dept
    c.line(YX, y, YX, y-HDR)           # Dept | Year20
    c.line(YX+0.37*inch, y, YX+0.37*inch, y-HDR)  # Year20 | Year25
    c.line(YX+0.72*inch, y, YX+0.72*inch, y-HDR)  # Year25 | OMB
    c.line(OX+0.84*inch, y, OX+0.84*inch, y-HDR)  # OMB | IRS Use

    # Year boxes fill (gray, no border)
    c.setFillColor(GRAY)
    c.rect(YX, y-HDR, 0.35*inch, HDR, fill=1, stroke=0)
    c.rect(YX+0.37*inch, y-HDR, 0.35*inch, HDR, fill=1, stroke=0)
    c.setFillColor(BLACK)

    # Content
    t(c,LM+3,y-10,"Form",7,bold=True)
    c.setFont("Helvetica-Bold",20); c.drawString(LM+2,y-30,"1040")

    t(c,DX+2,y-9,"Department of the Treasury—Internal Revenue Service",6)
    t(c,DX+2,y-20,"U.S. Individual Income Tax Return",11,bold=True)
    t(c,DX+2,y-31,"For the year Jan. 1–Dec. 31, 2025, or other tax year beginning",6.5)
    t(c,DX+2,y-40,"              , 2025, ending              , 20",6.5)
    t(c,DX+2.8*inch,y-40,"See separate instructions.",6)

    c.setFont("Helvetica-Bold",22); c.drawString(YX+3,y-33,"20")
    c.setFont("Helvetica-Bold",22); c.drawString(YX+0.4*inch,y-33,"25")

    OX=YX+0.75*inch
    t(c,OX+2,y-10,"OMB No. 1545-0074",6.5,bold=True)
    t(c,OX+2,y-20,"IRS Use Only—Do not write",5.5)
    t(c,OX+2,y-27,"or staple in this space.",5.5)

    t(c,OX+0.86*inch,y-10,"IRS Use Only—Do not write or staple in this space.",6)
    y-=HDR+1

    # ═══════════════════════════════════════
    # ROW 2: "For the year..." / "Filed pursuant" / Deceased/Spouse
    # ═══════════════════════════════════════
    R2H=0.175*inch
    rect(c,LM,y-R2H,RM-LM,R2H)
    t(c,LM+1,y-R2H+5,"□ Filed pursuant to section 301.9100-2",6.5)
    t(c,LM+1.7*inch,y-R2H+5,"□ Combat zone",6.5)
    t(c,LM+2.6*inch,y-R2H+5,"□ Other",6.5)
    vl(c,LM+3.5*inch,y,y-R2H)
    t(c,LM+3.55*inch,y-R2H+5,"□ Deceased  MM / DD / YYYY",6.5)
    vl(c,LM+5.4*inch,y,y-R2H)
    t(c,LM+5.45*inch,y-R2H+5,"Spouse  MM / DD / YYYY",6.5)
    y-=R2H

    # ═══════════════════════════════════════
    # NAME / SSN ROWS
    # ═══════════════════════════════════════
    NRH=0.27*inch
    MID=LM+2.9*inch
    SSN_X=LM+4.65*inch

    def name_row(c,y,l1,l2,l3,v1,v2,v3):
        rect(c,LM,y-NRH,MID-LM,NRH)
        rect(c,MID,y-NRH,SSN_X-MID,NRH)
        # SSN box with tick marks
        rect(c,SSN_X,y-NRH,RM-SSN_X,NRH)
        t(c,LM+1,y-7,l1,5.5); t(c,MID+1,y-7,l2,5.5); t(c,SSN_X+1,y-7,l3,5.5)
        t(c,LM+2,y-20,v1,9); t(c,MID+2,y-20,v2,9)
        t(c,SSN_X+4,y-21,v3,10,bold=True)
        return y-NRH

    fname=f"{data.get('firstName','') or ''} {data.get('mi','') or ''}".strip()
    y=name_row(c,y,"Your first name and middle initial","Last name",
               "Your social security number",
               fname,data.get('lastName','') or '',ssn_fmt(data.get('ssn','')))
    sp_ssn=data.get('spouseSSN','') or data.get('spouseSsn','') or ''
    y=name_row(c,y,"If joint return, spouse's first name and middle initial","Last name",
               "Spouse's social security number",
               data.get('spouseFirstName','') or '',
               data.get('spouseLastName','') or '',ssn_fmt(sp_ssn))

    # Address row
    APT_X=LM+4.65*inch
    rect(c,LM,y-NRH,APT_X-LM,NRH)
    rect(c,APT_X,y-NRH,RM-APT_X,NRH)
    t(c,LM+1,y-7,"Home address (number and street). If you have a P.O. box, see instructions.",5.5)
    t(c,APT_X+1,y-7,"Apt. no.",5.5)
    t(c,LM+2,y-20,data.get('address','') or '',9)
    y-=NRH

    # City/State/ZIP row + Presidential Election (tall box on right)
    PRES_W=1.45*inch
    PRES_X=RM-PRES_W
    CW=2.85*inch; SW=0.52*inch; ZW=PRES_X-LM-CW-SW
    rect(c,LM,y-NRH,CW,NRH); rect(c,LM+CW,y-NRH,SW,NRH)
    rect(c,LM+CW+SW,y-NRH,ZW,NRH)
    # Presidential Election - tall box spanning this row + foreign row below
    PRES_H=NRH+0.175*inch
    rect(c,PRES_X,y-PRES_H,PRES_W,PRES_H)
    t(c,PRES_X+2,y-8,"Presidential Election Campaign",6,bold=True)
    t(c,PRES_X+2,y-16,"Check here if you, or your spouse if filing",5.5)
    t(c,PRES_X+2,y-23,"jointly, want $3 to go to this fund. Checking",5.5)
    t(c,PRES_X+2,y-30,"a box below will not change your tax or refund.",5.5)
    t(c,PRES_X+8,y-38,"□ You",7); t(c,PRES_X+0.7*inch,y-38,"□ Spouse",7)

    t(c,LM+1,y-7,"City, town, or post office. If you have a foreign address, also complete spaces below.",5.5)
    t(c,LM+CW+1,y-7,"State",5.5); t(c,LM+CW+SW+1,y-7,"ZIP code",5.5)
    t(c,LM+2,y-20,data.get('city','') or '',9)
    t(c,LM+CW+2,y-20,data.get('state','') or '',9)
    t(c,LM+CW+SW+2,y-20,data.get('zip','') or '',9)
    y-=NRH

    # Foreign country row (partial width - Presidential box occupies right side)
    FH=0.175*inch
    rect(c,LM,y-FH,PRES_X-LM,FH)
    t(c,LM+1,y-FH+6,"Foreign country name",5.5)
    vl(c,LM+1.85*inch,y,y-FH)
    t(c,LM+1.87*inch,y-FH+6,"Foreign province/state/county",5.5)
    vl(c,LM+3.8*inch,y,y-FH)
    t(c,LM+3.82*inch,y-FH+6,"Foreign postal code",5.5)
    y-=FH

    # ═══════════════════════════════════════
    # FILING STATUS
    # ═══════════════════════════════════════
    TAB=0.65*inch
    FSH=0.58*inch
    rect(c,LM,y-FSH,TAB,FSH,fill=GRAY)
    t(c,LM+2,y-13,"Filing Status",7,bold=True)
    t(c,LM+2,y-23,"Check only",6); t(c,LM+2,y-30,"one box.",6)

    rect(c,LM+TAB,y-FSH,RM-LM-TAB,FSH)
    fs=data.get('filingStatus','')
    FX=LM+TAB+3; COL2=LM+TAB+(RM-LM-TAB)/2+3
    FS_ITEMS=[
        ("SINGLE","□ Single"),
        ("MARRIED_FILING_JOINTLY","□ Married filing jointly (even if only one had income)"),
        ("MARRIED_FILING_SEPARATELY","□ Married filing separately (MFS). Enter spouse's SSN above\n    and full name here:"),
        ("HEAD_OF_HOUSEHOLD","□ Head of household (HOH)"),
        ("QUALIFYING_SURVIVING_SPOUSE","□ Qualifying surviving spouse (QSS)"),
    ]
    def cb(val): return "■" if fs==val else "□"
    t(c,FX,y-12,f"{cb('SINGLE')} Single",6.5)
    t(c,FX,y-23,f"{cb('MARRIED_FILING_JOINTLY')} Married filing jointly (even if only one had income)",6.5)
    t(c,FX,y-34,f"{cb('MARRIED_FILING_SEPARATELY')} Married filing separately (MFS). Enter spouse's SSN above",6.5)
    t(c,FX+8,y-42,"and full name here:",6)
    hl(c,FX+0.85*inch,y-43,FX+2.5*inch,0.3)
    t(c,COL2,y-12,f"{cb('HEAD_OF_HOUSEHOLD')} Head of household (HOH)",6.5)
    t(c,COL2,y-23,f"{cb('QUALIFYING_SURVIVING_SPOUSE')} Qualifying surviving spouse (QSS)",6.5)
    t(c,COL2,y-34,"If you checked the HOH or QSS box, enter the child's name",6)
    t(c,COL2,y-42,"if the qualifying person is a child but not your dependent:",6)
    y-=FSH

    # Nonresident alien full-width row
    NAH=0.22*inch
    rect(c,LM,y-NAH,TAB,NAH,fill=LGRAY)
    rect(c,LM+TAB,y-NAH,RM-LM-TAB,NAH)
    t(c,LM+TAB+2,y-NAH+9,"□ If treating a nonresident alien or dual-status alien spouse as a U.S. resident for the entire tax year, check the box and enter their",6.5)
    t(c,LM+TAB+2,y-NAH+2,"    name (see instructions and attach statement if required):",6.5)
    y-=NAH

    # ═══════════════════════════════════════
    # DIGITAL ASSETS
    # ═══════════════════════════════════════
    DAH=0.22*inch
    rect(c,LM,y-DAH,TAB,DAH,fill=GRAY)
    t(c,LM+2,y-DAH/2-3,"Digital Assets",7,bold=True)
    rect(c,LM+TAB,y-DAH,RM-LM-TAB,DAH)
    da=data.get('digitalAssets',False)
    t(c,LM+TAB+2,y-9,"At any time during 2025, did you: (a) receive (as a reward, award, or payment for property or services); or (b) sell,",6.5)
    t(c,LM+TAB+2,y-17,"exchange, or otherwise dispose of a digital asset (or a financial interest in a digital asset)? (See instructions.)",6.5)
    t(c,RM-52,y-12,"□ Yes",8); t(c,RM-52+30,y-12,"■ No" if not da else "□ No",8)
    if da: t(c,RM-52,y-12,"■ Yes",8)
    y-=DAH

    # ═══════════════════════════════════════
    # DEPENDENTS - exact layout from image
    # (1)First name, (2)Last name, (3)SSN, (4)Relationship, (5)lived, (6)student/disabled, (7)credits
    # 4 columns: Dependent 1/2/3/4
    # ═══════════════════════════════════════
    deps=data.get('dependents',[])
    DEP_COL_W=(RM-LM-TAB)/4

    # Header row
    DEPH=0.155*inch
    rect(c,LM,y-DEPH,TAB,DEPH,fill=GRAY)
    t(c,LM+1,y-DEPH+5,"Dependents",6.5,bold=True)
    t(c,LM+1,y-DEPH+0,"(see instructions)",5)
    rect(c,LM+TAB,y-DEPH,RM-LM-TAB,DEPH,fill=GRAY)
    for ci in range(4):
        cx=LM+TAB+ci*DEP_COL_W
        if ci>0: vl(c,cx,y,y-DEPH)
        t(c,cx+(DEP_COL_W/2),y-DEPH+5,f"Dependent {ci+1}",6,bold=True)
    y-=DEPH

    def dep_row(c,y,label,field,rh=0.155*inch,cb_row=False):
        rect(c,LM,y-rh,TAB,rh,fill=LGRAY)
        t(c,LM+1,y-rh+4,label,5.5)
        for ci in range(4):
            cx=LM+TAB+ci*DEP_COL_W
            rect(c,cx,y-rh,DEP_COL_W,rh)
            if ci<len(deps) and not cb_row:
                d=deps[ci]
                vals={"(1) First name":d.get('firstName',''),
                      "(2) Last name":d.get('lastName',''),
                      "(3) SSN":ssn_fmt(d.get('ssn','')),
                      "(4) Relationship":d.get('relationship','')}
                val=vals.get(label,'')
                if val: t(c,cx+2,y-rh+4,val,7)
        return y-rh

    y=dep_row(c,y,"(1) First name","firstName")
    y=dep_row(c,y,"(2) Last name","lastName")
    y=dep_row(c,y,"(3) SSN","ssn")
    y=dep_row(c,y,"(4) Relationship","relationship")

    # Row 5: Check if lived with you
    RH5=0.24*inch
    rect(c,LM,y-RH5,TAB,RH5,fill=LGRAY)
    t(c,LM+1,y-8,"(5) Check if lived",5.5)
    t(c,LM+1,y-14,"with you more",5.5)
    t(c,LM+1,y-20,"than half of 2025",5.5)
    for ci in range(4):
        cx=LM+TAB+ci*DEP_COL_W
        rect(c,cx,y-RH5,DEP_COL_W,RH5)
        t(c,cx+3,y-9,"(a) □ Yes",6)
        t(c,cx+3,y-17,"(b) □ And in the U.S.",6)
    y-=RH5

    # Row 6: Full-time student/disabled
    RH6=0.3*inch
    rect(c,LM,y-RH6,TAB,RH6,fill=LGRAY)
    t(c,LM+1,y-10,"(6) Check if",5.5)
    for ci in range(4):
        cx=LM+TAB+ci*DEP_COL_W
        rect(c,cx,y-RH6,DEP_COL_W,RH6)
        t(c,cx+3,y-8,"□ Full-time",5.5); t(c,cx+3,y-14,"    student",5.5)
        t(c,cx+DEP_COL_W/2+2,y-8,"□ Permanently",5.5)
        t(c,cx+DEP_COL_W/2+2,y-14,"    and totally",5.5)
        t(c,cx+DEP_COL_W/2+2,y-20,"    disabled",5.5)
    y-=RH6

    # Row 7: Credits
    RH7=0.22*inch
    rect(c,LM,y-RH7,TAB,RH7,fill=LGRAY)
    t(c,LM+1,y-RH7+8,"(7) Credits",5.5)
    for ci in range(4):
        cx=LM+TAB+ci*DEP_COL_W
        rect(c,cx,y-RH7,DEP_COL_W,RH7)
        t(c,cx+3,y-9,"□ Child tax",5.5); t(c,cx+3,y-16,"    credit",5.5)
        t(c,cx+DEP_COL_W/2+2,y-9,"□ Credit for",5.5)
        t(c,cx+DEP_COL_W/2+2,y-16,"    other dep.",5.5)
    y-=RH7

    # MFS/HOH full-width note
    MFH=0.22*inch
    rect(c,LM,y-MFH,RM-LM,MFH)
    t(c,LM+2,y-9,"□ Check if your filing status is MFS or HOH and you lived apart from your spouse for the last 6 months of 2025, or you are legally",6)
    t(c,LM+2,y-16,"    separated according to your state law under a written separation agreement or a decree of separate maintenance and you did not live in the same household as your spouse at the end of 2025.",6)
    y-=MFH

    # ═══════════════════════════════════════
    # INCOME
    # ═══════════════════════════════════════
    AMTW=0.88*inch; LNW=0.22*inch
    AMTX=RM-AMTW; LNX=AMTX-LNW
    IL=0.163*inch

    IH=0.165*inch
    rect(c,LM,y-IH,TAB,IH,fill=GRAY)
    t(c,LM+2,y-IH+5,"Income",9,bold=True)
    rect(c,LM+TAB,y-IH,RM-LM-TAB,IH)
    t(c,LM+TAB+2,y-IH+5,"Attach Form(s) W-2 here. Also attach Forms W-2G and 1099-R if tax was withheld.",6)
    y-=IH

    SB1="Attach Form(s)\nW-2 here. Also\nattach W-2G\nand 1099-R if\ntax withheld.\n\nIf you did not\nget a Form\nW-2, see inst."
    SB2="Attach Sch. B\nif required."

    def iline(c,y,no,desc,val="",sub=False,bold=False,shade=False,sb=""):
        if sb:
            rect(c,LM,y-IL,TAB,IL,fill=LGRAY,lw=0.3)
            c.setFont("Helvetica",4.3)
            lns=sb.split('\n'); step=IL/max(len(lns),1)
            for ji,ln in enumerate(lns[:5]):
                c.drawString(LM+1,y-IL+(IL-ji*step-step*0.3),ln)
        else:
            rect(c,LM,y-IL,TAB,IL,lw=0.3)
        if shade:
            c.setFillColor(LGRAY); c.rect(LM+TAB,y-IL,RM-LM-TAB,IL,fill=1,stroke=0); c.setFillColor(BLACK)
        hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
        rect(c,LNX,y-IL,LNW,IL,lw=0.5)
        rect(c,AMTX,y-IL,AMTW,IL,lw=0.5)
        t(c,LNX+2,y-IL+4,no,6.5,bold=bold)
        if val: t(c,AMTX+AMTW-3,y-IL+4,val,8,bold=bold,right=True)
        dx=LM+TAB+2+(10 if sub else 0)
        t(c,dx,y-IL+4,desc,6.5,bold=bold)
        de=dx+len(desc)*3.6
        if de<LNX-8: dots(c,de,y-IL+4,LNX-4)
        return y-IL

    y=iline(c,y,"1a","Total amount from Form(s) W-2, box 1 (see instructions)",money(f.get('totalIncome')),sb=SB1)
    y=iline(c,y,"b","Household employee wages not reported on Form(s) W-2","",sub=True)
    y=iline(c,y,"c","Tip income not reported on line 1a (see instructions)","",sub=True)
    y=iline(c,y,"d","Medicaid waiver payments not reported on Form(s) W-2 (see instructions)","",sub=True)
    y=iline(c,y,"e","Taxable dependent care benefits from Form 2441, line 26","",sub=True)
    y=iline(c,y,"f","Employer-provided adoption benefits from Form 8839, line 31","",sub=True)
    y=iline(c,y,"g","Wages from Form 8919, line 6","",sub=True)
    y=iline(c,y,"h","Other earned income (see instructions). Enter type and amount:","",sub=True)
    y=iline(c,y,"i","Nontaxable combat pay election (see instructions)","",sub=True)
    y=iline(c,y,"z","Add lines 1a through 1h",money(f.get('totalIncome')),bold=True,shade=True)
    y=iline(c,y,"2a",f"Tax-exempt interest  2a  {money(income.get('taxExemptInterest','')) or ''}     b  Taxable interest",money(income.get('interest','')),sb=SB2)
    y=iline(c,y,"3a",f"Qualified dividends  3a  {money(income.get('qualDividends','')) or ''}     b  Ordinary dividends",money(income.get('dividends','')))
    y=iline(c,y,"c","Check if your child's dividends are included  1□ Line 3a  2□ Line 3b","",sub=True)
    y=iline(c,y,"4a","IRA distributions  4a          b  Taxable amount",money(income.get('iraTaxable','')))
    y=iline(c,y,"c","Check if (see instructions)  1□ Rollover  2□ QCD  3□","",sub=True)
    y=iline(c,y,"5a","Pensions and annuities  5a          b  Taxable amount",money(income.get('pensionsTaxable','')))
    y=iline(c,y,"c","Check if (see instructions)  1□ Rollover  2□ PSO  3□","",sub=True)
    y=iline(c,y,"6a","Social security benefits  6a          b  Taxable amount",money(income.get('ssTaxable','')))
    y=iline(c,y,"c","If you elect to use the lump-sum election method, check here (see instructions)  □","",sub=True)
    y=iline(c,y,"7a","Capital gain or (loss). Attach Schedule D if required",money(income.get('capitalGain','')))
    y=iline(c,y,"b","Check if:  □ Schedule D not required  □ Includes child's capital gain or (loss)","",sub=True)
    y=iline(c,y,"8","Additional income from Schedule 1, line 10",money(income.get('otherIncome','')))
    y=iline(c,y,"9","Add lines 1z, 2b, 3b, 4b, 5b, 6b, 7a, and 8. This is your total income",money(f.get('totalIncome')),bold=True,shade=True)
    y=iline(c,y,"10","Adjustments to income from Schedule 1, line 26",money(income.get('adjustments','')))
    y=iline(c,y,"11a","Subtract line 10 from line 9. This is your adjusted gross income",money(f.get('adjustedGrossIncome')),bold=True,shade=True)

    hl(c,LM,0.28*inch,RM,0.5)
    t(c,LM,0.18*inch,"For Disclosure, Privacy Act, and Paperwork Reduction Act Notice, see separate instructions.",6)
    t(c,LM+3.3*inch,0.18*inch,"Cat. No. 11320B",6)
    t(c,RM,0.18*inch,"Form 1040 (2025)",7,bold=True,right=True)

def page2(c,data):
    f=data.get('f1040',{}); pay=data.get('payments',{}); prep=data.get('preparer',{})
    TAB=0.65*inch; AMTW=0.88*inch; LNW=0.22*inch
    AMTX=RM-AMTW; LNX=AMTX-LNW; IL=0.163*inch

    y=H-0.22*inch
    rect(c,LM,y-0.27*inch,RM-LM,0.27*inch)
    t(c,LM+2,y-0.12*inch,"Form 1040 (2025)",7,bold=True)
    t(c,LM+2,y-0.22*inch,f"Name: {data.get('firstName','')} {data.get('lastName','')}",7)
    t(c,RM-2,y-0.12*inch,"Page 2",7,bold=True,right=True)
    t(c,RM-2,y-0.22*inch,ssn_fmt(data.get('ssn','')),8,bold=True,right=True)
    y-=0.30*inch

    def line2(c,y,no,desc,val="",bold=False,shade=False,sub=False,sb=""):
        if sb:
            rect(c,LM,y-IL,TAB,IL,fill=LGRAY,lw=0.3)
            c.setFont("Helvetica",4.3)
            for ji,ln in enumerate(sb.split('\n')[:4]):
                c.drawString(LM+1,y-IL+(IL*(4-ji)/4),ln)
        else: rect(c,LM,y-IL,TAB,IL,lw=0.3)
        if shade:
            c.setFillColor(LGRAY); c.rect(LM+TAB,y-IL,RM-LM-TAB,IL,fill=1,stroke=0); c.setFillColor(BLACK)
        hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
        rect(c,LNX,y-IL,LNW,IL,lw=0.5); rect(c,AMTX,y-IL,AMTW,IL,lw=0.5)
        t(c,LNX+2,y-IL+4,no,6.5,bold=bold)
        if val: t(c,AMTX+AMTW-3,y-IL+4,val,8,bold=bold,right=True)
        dx=LM+TAB+2+(10 if sub else 0)
        t(c,dx,y-IL+4,desc,6.5,bold=bold)
        de=dx+len(desc)*3.6
        if de<LNX-8: dots(c,de,y-IL+4,LNX-4)
        return y-IL

    def sec(c,y,title):
        SH=0.165*inch
        rect(c,LM,y-SH,TAB,SH,fill=GRAY); rect(c,LM+TAB,y-SH,RM-LM-TAB,SH,fill=GRAY)
        t(c,LM+2,y-SH+4,title,8,bold=True); return y-SH

    tax=float(f.get('totalTax') or 0); std=float(f.get('standardDeduction') or f.get('itemizedDeduction') or 0)
    tx=float(f.get('taxableIncome') or 0); agi=float(f.get('adjustedGrossIncome') or 0)
    tpay=float(f.get('totalPayments') or 0); row=float(f.get('refundOrOwed') or 0)
    fw=float(pay.get('federalWithheld') or 0)
    est=sum(float(pay.get(f'est_q{q}') or 0) for q in range(1,5))
    eic=float(pay.get('eic') or 0); ctc=float(pay.get('additionalChildTax') or 0)
    aoc=float(pay.get('americanOpportunityCredit') or 0)
    refund=row if row>=0 else 0; owed=abs(row) if row<0 else 0

    y=sec(c,y,"Tax and Credits")

    SD_SB="Standard\ndeduction for—\n• Single or MFS,\n  $15,750\n• MFJ or QSS,\n  $31,500\n• HOH, $23,625\n• If you checked\n  a box on line\n  12a-d, see inst."

    # 11b
    rect(c,LM,y-IL,TAB,IL,fill=LGRAY,lw=0.3)
    rect(c,LM+TAB,y-IL,RM-LM-TAB,IL,lw=0.3)
    rect(c,LNX,y-IL,LNW,IL,lw=0.5); rect(c,AMTX,y-IL,AMTW,IL,lw=0.5)
    t(c,LNX+2,y-IL+4,"11b",6.5)
    t(c,LM+TAB+2,y-IL+4,"Amount from line 11a (adjusted gross income)",6.5)
    t(c,AMTX+AMTW-3,y-IL+4,money(agi),8,right=True)
    hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
    y-=IL

    # 12a checkbox row
    for row_txt in [
        "12a  □ Someone can claim  □ You as a dependent   □ Your spouse as a dependent",
        "    b  □ Spouse itemizes on a separate return   c  □ You were a dual-status alien",
        f"    d  You:  □ Were born before January 2, 1961  □ Are blind     Spouse:  □ Was born before January 2, 1961  □ Is blind",
    ]:
        rect(c,LM,y-IL,TAB,IL,fill=LGRAY,lw=0.3)
        rect(c,LM+TAB,y-IL,RM-LM-TAB,IL,lw=0.3)
        t(c,LM+TAB+2,y-IL+4,row_txt,6.5)
        hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
        y-=IL

    y=line2(c,y,"12e","Standard deduction or itemized deductions (from Schedule A)",money(std),sb=SD_SB)
    y=line2(c,y,"13a","Qualified business income deduction from Form 8995 or Form 8995-A")
    y=line2(c,y,"b","Additional deductions from Schedule 1-A, line 38","",sub=True)
    y=line2(c,y,"14","Add lines 12e, 13a, and 13b",money(std))
    y=line2(c,y,"15","Subtract line 14 from line 11b. If zero or less, enter -0-. This is your taxable income",money(tx),bold=True,shade=True)
    y=line2(c,y,"16","Tax (see instructions). Check if any from Form(s):  1□ 8814   2□ 4972   3□",money(tax))
    y=line2(c,y,"17","Amount from Schedule 2, line 3","")
    y=line2(c,y,"18","Add lines 16 and 17",money(tax))
    y=line2(c,y,"19","Child tax credit or credit for other dependents from Schedule 8812","")
    y=line2(c,y,"20","Amount from Schedule 3, line 8","")
    y=line2(c,y,"21","Add lines 19 and 20","")
    y=line2(c,y,"22","Subtract line 21 from line 18. If zero or less, enter -0-",money(tax))
    y=line2(c,y,"23","Other taxes, including self-employment tax, from Schedule 2, line 21","")
    y=line2(c,y,"24","Add lines 22 and 23. This is your total tax",money(tax),bold=True,shade=True)

    y=sec(c,y,"Payments and Refundable Credits")

    # 25 sub-lines with mid column
    MX=LNX-0.88*inch; MW=0.88*inch; MLX=MX-LNW

    def pay_sub(c,y,no,desc,val=""):
        rect(c,LM,y-IL,TAB,IL,lw=0.3)
        hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
        t(c,LM+TAB+14,y-IL+4,desc,6.5)
        rect(c,MLX,y-IL,LNW,IL,lw=0.5); t(c,MLX+2,y-IL+4,no,6.5)
        rect(c,MX,y-IL,MW,IL,lw=0.5)
        if val: t(c,MX+MW-3,y-IL+4,val,8,right=True)
        return y-IL

    rect(c,LM,y-IL,TAB,IL,lw=0.3)
    rect(c,LM+TAB,y-IL,RM-LM-TAB,IL,lw=0.3)
    t(c,LM+TAB+2,y-IL+4,"25  Federal income tax withheld from:",6.5,bold=True)
    hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
    y-=IL
    y=pay_sub(c,y,"25a","Form(s) W-2",money(fw))
    y=pay_sub(c,y,"25b","Form(s) 1099","")
    y=pay_sub(c,y,"25c","Other forms (see instructions)","")

    EIC_SB="If you have a\nqualifying child,\nyou may need to\nattach Sch. EIC."
    y=line2(c,y,"25d","Add lines 25a through 25c",money(fw),shade=True)
    y=line2(c,y,"26","2025 estimated tax payments and amount applied from 2024 return",money(est) if est else "")
    y=line2(c,y,"27a","Earned income credit (EIC)",money(eic) if eic else "",sb=EIC_SB)
    y=line2(c,y,"b","Clergy filing Schedule SE (see instructions)","",sub=True)
    y=line2(c,y,"c","If you do not want to claim the EIC, check here  □","",sub=True)
    y=line2(c,y,"28","Additional child tax credit (ACTC) from Schedule 8812. If you do not want to claim the ACTC, check here  □",money(ctc) if ctc else "")
    y=line2(c,y,"29","American opportunity credit from Form 8863, line 8",money(aoc) if aoc else "")
    y=line2(c,y,"30","Refundable adoption credit from Form 8839, line 13","")
    y=line2(c,y,"31","Amount from Schedule 3, line 15","")
    y=line2(c,y,"32","Add lines 27a, 28, 29, 30, and 31. These are your total other payments and refundable credits","")
    y=line2(c,y,"33","Add lines 25d, 26, and 32. These are your total payments",money(tpay),bold=True,shade=True)

    y=sec(c,y,"Refund")
    y=line2(c,y,"34","If line 33 is more than line 24, subtract line 24 from line 33. This is the amount you overpaid",money(refund))
    y=line2(c,y,"35a","Amount of line 34 you want refunded to you. If Form 8888 is attached, check here  ▶  □",money(refund),bold=True,shade=True)

    # Routing/account boxes
    DS_SB="Direct deposit?\nSee instructions."
    rect(c,LM,y-IL,TAB,IL,fill=LGRAY,lw=0.3)
    c.setFont("Helvetica",4.5)
    for ji,ln in enumerate(DS_SB.split('\n')):
        c.drawString(LM+1,y-IL+(IL*(2-ji)/2)+1,ln)
    rect(c,LM+TAB,y-IL,RM-LM-TAB,IL,lw=0.3)
    hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
    t(c,LM+TAB+2,y-IL+4,"b  Routing number",6.5)
    BX=LM+TAB+0.9*inch
    for i in range(9):
        rect(c,BX+i*0.155*inch,y-IL+1,0.145*inch,IL-3,lw=0.3)
    t(c,BX+1.5*inch,y-IL+4,"c  Type:  □ Checking    □ Savings",6.5)
    y-=IL

    rect(c,LM,y-IL,TAB,IL,lw=0.3)
    rect(c,LM+TAB,y-IL,RM-LM-TAB,IL,lw=0.3)
    hl(c,LM+TAB,y,RM,0.3); hl(c,LM+TAB,y-IL,RM,0.3)
    t(c,LM+TAB+2,y-IL+4,"d  Account number",6.5)
    AX=LM+TAB+0.9*inch
    for i in range(17):
        rect(c,AX+i*0.155*inch,y-IL+1,0.145*inch,IL-3,lw=0.3)
    y-=IL
    y=line2(c,y,"36","Amount of line 34 you want applied to your 2026 estimated tax  ▶","")

    y=sec(c,y,"Amount You Owe")
    y=line2(c,y,"37","Subtract line 33 from line 24. This is the amount you owe. For details on how to pay, go to www.irs.gov/Payments or see instructions  ▶",money(owed) if owed else "",bold=owed>0,shade=owed>0)
    y=line2(c,y,"38","Estimated tax penalty (see instructions)","")

    if refund>0:
        c.setFillColor(colors.Color(0.8,1.0,0.8))
        c.rect(AMTX,y+IL*3,AMTW+LNW,IL*2,fill=1,stroke=1)
        c.setFillColor(colors.Color(0,0.4,0))
        c.setFont("Helvetica-Bold",7); c.drawCentredString(AMTX+AMTW/2,y+IL*3+IL+3,"REFUND")
        c.setFont("Helvetica-Bold",10); c.drawCentredString(AMTX+AMTW/2,y+IL*3+3,f"${refund:,.2f}")
        c.setFillColor(BLACK)

    y-=4
    # Third Party Designee
    TPY=y-4
    hl(c,LM,TPY,RM,1)
    rect(c,LM,TPY-0.27*inch,TAB,0.27*inch,fill=GRAY)
    t(c,LM+2,TPY-0.12*inch,"Third Party",7,bold=True)
    t(c,LM+2,TPY-0.22*inch,"Designee",7,bold=True)
    rect(c,LM+TAB,TPY-0.27*inch,RM-LM-TAB,0.27*inch)
    t(c,LM+TAB+2,TPY-0.1*inch,"Do you want to allow another person to discuss this return with the IRS? See instructions.",6.5)
    t(c,LM+TAB+2,TPY-0.2*inch,"□ Yes. Complete below.",7); t(c,LM+TAB+1.5*inch,TPY-0.2*inch,"■ No",7)
    t(c,LM+TAB+2.2*inch,TPY-0.2*inch,"Designee's name",5.5); hl(c,LM+TAB+2.9*inch,TPY-0.27*inch,LM+TAB+4.0*inch,0.3)
    t(c,LM+TAB+4.05*inch,TPY-0.2*inch,"Phone no.",5.5); hl(c,LM+TAB+4.6*inch,TPY-0.27*inch,LM+TAB+5.4*inch,0.3)
    t(c,LM+TAB+5.45*inch,TPY-0.2*inch,"Personal identification number (PIN)",5.5); hl(c,LM+TAB+6.8*inch,TPY-0.27*inch,RM,0.3)

    # Sign Here
    SY=TPY-0.29*inch
    hl(c,LM,SY,RM,1.2)
    rect(c,LM,SY-0.44*inch,TAB,0.44*inch,fill=GRAY)
    t(c,LM+3,SY-0.13*inch,"Sign",8,bold=True); t(c,LM+3,SY-0.22*inch,"Here",8,bold=True)
    t(c,LM+3,SY-0.32*inch,"Joint return?",5.5); t(c,LM+3,SY-0.39*inch,"See instructions.",5.5)
    t(c,LM+3,SY-0.46*inch,"Keep a copy for",5.5)

    SX=LM+TAB
    t(c,SX+1,SY-0.08*inch,"Under penalties of perjury, I declare that I have examined this return and accompanying schedules and statements, and to the best of my knowledge and",6)
    t(c,SX+1,SY-0.15*inch,"belief, they are true, correct, and complete. Declaration of preparer (other than taxpayer) is based on all information of which preparer has any knowledge.",6)

    SL=SY-0.29*inch
    hl(c,SX,SL,SX+1.75*inch,0.4); t(c,SX,SL+2,"Your signature",5.5)
    hl(c,SX+1.8*inch,SL,SX+2.45*inch,0.4); t(c,SX+1.8*inch,SL+2,"Date",5.5)
    hl(c,SX+2.5*inch,SL,SX+3.45*inch,0.4); t(c,SX+2.5*inch,SL+2,"Your occupation",5.5)
    if data.get('occupation'): t(c,SX+2.52*inch,SL-7,data.get('occupation'),7)
    t(c,SX+3.5*inch,SL+2,"If the IRS sent you an Identity Protection PIN, enter it here (see inst.)",5.5)
    hl(c,SX+5.6*inch,SL,RM,0.4)

    SL2=SL-0.2*inch
    hl(c,SX,SL2,SX+1.75*inch,0.4); t(c,SX,SL2+2,"Spouse's signature. If a joint return, both must sign.",5.5)
    hl(c,SX+1.8*inch,SL2,SX+2.45*inch,0.4); t(c,SX+1.8*inch,SL2+2,"Date",5.5)
    hl(c,SX+2.5*inch,SL2,SX+3.45*inch,0.4); t(c,SX+2.5*inch,SL2+2,"Spouse's occupation",5.5)
    if data.get('spouseOccupation'): t(c,SX+2.52*inch,SL2-7,data.get('spouseOccupation'),7)
    t(c,SX+3.5*inch,SL2+2,"If the IRS sent your spouse an Identity Protection PIN, enter it here (see inst.)",5.5)

    SL3=SL2-0.15*inch
    t(c,SX,SL3+2,"Phone no.",5.5); hl(c,SX+0.5*inch,SL3,SX+1.7*inch,0.3)
    if data.get('daytimePhone'): t(c,SX+0.52*inch,SL3+2,data.get('daytimePhone'),7)
    t(c,SX+1.75*inch,SL3+2,"Email address",5.5); hl(c,SX+2.4*inch,SL3,RM,0.3)
    if data.get('email'): t(c,SX+2.42*inch,SL3+2,data.get('email'),7)

    PY=SL3-0.2*inch; hl(c,LM,PY,RM,1)
    rect(c,LM,PY-0.38*inch,TAB,0.38*inch,fill=GRAY)
    t(c,LM+2,PY-0.11*inch,"Paid",7,bold=True); t(c,LM+2,PY-0.20*inch,"Preparer",7,bold=True); t(c,LM+2,PY-0.29*inch,"Use Only",7,bold=True)

    PX=LM+TAB
    t(c,PX,PY-0.08*inch,"Preparer's name",5.5); hl(c,PX,PY-0.13*inch,PX+1.2*inch,0.3)
    if prep.get('name'): t(c,PX+1,PY-0.12*inch,prep['name'],6.5)
    t(c,PX+1.25*inch,PY-0.08*inch,"Preparer's signature",5.5); hl(c,PX+1.25*inch,PY-0.13*inch,PX+2.6*inch,0.3)
    t(c,PX+2.65*inch,PY-0.08*inch,"Date",5.5); hl(c,PX+2.65*inch,PY-0.13*inch,PX+3.45*inch,0.3)
    if prep.get('date'): t(c,PX+2.67*inch,PY-0.12*inch,prep['date'],6.5)
    t(c,PX+3.5*inch,PY-0.08*inch,"PTIN",5.5); hl(c,PX+3.5*inch,PY-0.13*inch,PX+4.4*inch,0.3)
    if prep.get('ptin'): t(c,PX+3.52*inch,PY-0.12*inch,prep['ptin'],6.5)
    t(c,PX+4.45*inch,PY-0.08*inch,"Check if:",5.5); t(c,PX+4.45*inch,PY-0.15*inch,"□ Self-employed",6)

    t(c,PX,PY-0.2*inch,"Firm's name  ▶",5.5); hl(c,PX,PY-0.25*inch,RM-1.1*inch,0.3)
    if prep.get('firmName'): t(c,PX+0.75*inch,PY-0.24*inch,prep['firmName'],6.5)
    t(c,RM-1.05*inch,PY-0.2*inch,"Phone no.",5.5); hl(c,RM-1.05*inch,PY-0.25*inch,RM,0.3)
    if prep.get('phone'): t(c,RM-1.03*inch,PY-0.24*inch,prep['phone'],6.5)

    t(c,PX,PY-0.3*inch,"Firm's address  ▶",5.5); hl(c,PX,PY-0.35*inch,RM-1.1*inch,0.3)
    if prep.get('address'): t(c,PX+0.82*inch,PY-0.34*inch,prep['address'],6.5)
    t(c,RM-1.05*inch,PY-0.3*inch,"Firm's EIN  ▶",5.5); hl(c,RM-1.05*inch,PY-0.35*inch,RM,0.3)
    if prep.get('ein'): t(c,RM-1.03*inch,PY-0.34*inch,prep['ein'],6.5)

    hl(c,LM,0.26*inch,RM,0.5)
    t(c,LM,0.16*inch,"Go to www.irs.gov/Form1040 for instructions and the latest information.",6)
    t(c,RM,0.16*inch,"Form 1040 (2025)",7,bold=True,right=True)

if __name__ == "__main__":
    if len(sys.argv)<3: print("Usage: generate_1040_exact.py <data.json> <output.pdf>"); sys.exit(1)
    with open(sys.argv[1]) as f: data=json.load(f)
    generate(data, sys.argv[2])
