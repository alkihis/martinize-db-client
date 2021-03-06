import React from 'react';
import NglWrapper, { NglComponent, NglRepresentation } from '../NglWrapper';
import PickingProxy from '@mmsb/ngl/declarations/controls/picking-proxy';
import { Vector3 } from 'three';
import { Shape } from '@mmsb/ngl';
import { Typography, Divider, Button, Box, Link, TextField, FormControlLabel, Checkbox } from '@material-ui/core';
import * as ngl from '@mmsb/ngl';
import { Marger, FaIcon } from '../../../helpers';
import BallAndStickRepresentation from '@mmsb/ngl/declarations/representation/ballandstick-representation';
import { toast } from '../../Toaster';
import GoBondsHelper from '../GoBondsHelper';

interface GoEditorProps {
  stage: NglWrapper;
  cgCmp: NglComponent;
  onBondCreate(go_atom_1: number, go_atom_2: number): Promise<any>;
  onBondRemove(real_atom_1: number, real_atom_2: number): any;
  onAllBondRemove(from_go_atom: number): any;

  onBondCreateFromSet(atoms: Set<number>, target?: Set<number>): any;
  onBondRemoveFromSet(atoms: Set<number>, target?: Set<number>): any;
  onGoHistoryBack(opacity?: number): any;
  onGoHistoryRevert(opacity?: number): any;

  onValidate(): any;
  onCancel(): any;

  onRedrawGoBonds(highlight?: number | [number, number], opacity?: number): any;
  setColorForCgRepr(schemeId?: string): any;

  goInstance: GoBondsHelper;
}

interface GoEditorState {
  mode: 'idle' | 'add-link';
  selected?: {
    type: 'atom',
    source: number,
  } | { 
    type: 'link',
    source: number,
    target: number,
  } | {
    type: 'selection',
    s1: Set<number>,
    s2?: Set<number>,
  };
  select_1: string;
  select_2: string;
  show_side_chains: boolean;
  enable_history: boolean;
}

interface PickedGoBond {
  name: string;
  color: { r: number, g: number, b: number };
  radius: number;
  position1: Vector3;
  position2: Vector3;
  shape: Shape;
}

// Mode idle:
// Click one atom or bond, selected will be filled
// IF ATOM: Remove all bonds from this atom (go atom selected) OR create a new bond from this atom
// IF LINK: Remove this link
// When create bond: Click on a atom, link will be automatically created

export default class GoEditor extends React.Component<GoEditorProps, GoEditorState> {
  state: GoEditorState = {
    mode: 'idle',
    select_1: '',
    select_2: '',
    show_side_chains: false,
    enable_history: true,
  };

  protected get repr() {
    return this.props.cgCmp.representations[0] as NglRepresentation<BallAndStickRepresentation>;
  }

  protected get can_go_back() {
    return this.props.goInstance.history_length > 0;
  }

  protected get can_go_further() {
    return this.props.goInstance.reverse_history_length > 0;
  }

  protected get selection_suffix() {
    if (this.state.show_side_chains) {
      return ".CA or .SC1 or .BB or .SC2 or .SC3 or .SC4";
    }
    return ".CA";
  }

  componentDidMount() {
    // @ts-ignore
    window.GoEditor = this;

    this.props.stage.onClick(this.nglClickReciever);
    this.props.stage.removePanOnClick();
    this.repr.applySelection(this.selection_suffix);
  }

  componentWillUnmount() {
    this.props.stage.removeEvents();
    this.props.onRedrawGoBonds();
    this.props.stage.restoreDefaultMouseEvents();
    this.props.setColorForCgRepr();
    this.repr.applySelection("*");
  }

  nglClickReciever = (pp?: PickingProxy) => {
    if (this.state.selected?.type === 'selection') {
      return;
    }

    if (!pp) {
      // Disable selection. De-highlight all only if not in atom selection
      if (this.state.mode === 'idle') {
        if (this.state.selected?.type === 'link') {
          this.removeBondHighlight();
        }
        if (this.state.selected?.type === 'atom') {
          this.removeAtomHighlight();
        }

        this.setState({ 
          selected: undefined,
        });
      }

      return;
    }

    // Detect type
    // If go atom, pp.atom.element === "CA"
    if (pp.atom?.element === "CA") {
      // GO atom
      let source_or_target = pp.atom.index;
      // Get the residue index (this is the needed thing to highlight it)

      if (this.state.mode === 'add-link' && this.state.selected?.type === 'atom') {
        const go_atom_1 = this.state.selected.source;
        // Create the bond if possible
        if (this.state.selected.source !== source_or_target) {
          this.props.onBondCreate(go_atom_1, source_or_target)
            .then(() => {
              // redraw the bonds for selected atom
              this.highlightBond(go_atom_1 + 1);
            });
        }

        this.setState({
          mode: 'idle'
        });

        // Stop here
        return;
      }

      // Remove the highlighted bond/the highlighted atom
      if (this.state.selected?.type === 'link') {
        this.removeBondHighlight();
      }
      else {
        this.removeAtomHighlight();
      }

      // Highlight the selected one
      this.highlightAtom(source_or_target);

      this.setState({
        selected: {
          type: 'atom',
          source: source_or_target,
        }
      });
    }
    else if (pp.atom === undefined && pp.bond === undefined && (pp.object as PickedGoBond)?.name) {
      if (this.state.mode === 'add-link') {
        // can't select for now
        return;
      }

      // this might be a go bond...
      const obj = pp.object as PickedGoBond;

      if (!obj.name.startsWith('[GO]')) {
        return;
      }

      // Remove highlight atom if any
      if (this.state.selected?.type === 'atom') {
        this.removeAtomHighlight();
      }
      
      // Get atoms
      const [source, target] = obj.name.split('atoms ')[1].split('-').map(Number);

      // Highlight the bond
      this.highlightBond([source, target]);

      this.setState({
        selected: {
          type: 'link',
          source,
          target,
        }
      });
    }
  };

  highlightBond(target: [number, number] | number) {
    this.props.onRedrawGoBonds(target, 1);
  } 

  removeBondHighlight() {
    this.props.onRedrawGoBonds(undefined, 1);
  }

  highlightAtom(atom_index: number) {
    const schemeId = ngl.ColormakerRegistry.addSelectionScheme([
      ["red", `@${atom_index}`],
      // @ts-ignore
      ["element", "*"],
    ], "test");
    
    this.props.setColorForCgRepr(schemeId);
    this.props.onRedrawGoBonds(atom_index + 1, 1);
  }

  highlightGroup(atom_indexes: Set<number>, atom_indexes_2?: Set<number>) {
    // Remember that recieved groups of atom indexes are 1-indexes, not 0-indexes like NGL !

    const items = [
      ["red", `@${[...atom_indexes].map(e => String(e - 1)).join(',')}`]
    ];

    if (atom_indexes_2) {
      items.push(
        ["blue", `@${[...atom_indexes_2].map(e => String(e - 1)).join(',')}`]
      );
    }

    items.push(["element", "*"]);

    // @ts-ignore
    const schemeId = ngl.ColormakerRegistry.addSelectionScheme(items, "test");
    
    this.props.setColorForCgRepr(schemeId);
    this.props.onRedrawGoBonds(undefined, 1);
  }

  removeAtomHighlight() {
    this.props.setColorForCgRepr();
    this.props.onRedrawGoBonds();
  }

  onAddLinkEnable = () => {
    this.setState({ mode: 'add-link' });
  };

  onAddLinkDisable = () => {
    this.setState({ mode: 'idle' });
  };
  
  onRemoveAllBonds = () => {
    const { selected } = this.state;
    if (!selected|| !('source' in selected)) {
      return;
    }

    this.props.onAllBondRemove(selected.source);
  };

  onRemoveBond = () => {
    const { selected } = this.state;
    if (!selected || selected.type !== 'link') {
      return;
    }

    this.props.onBondRemove(selected.source, selected.target);
    this.setState({ mode: 'idle', selected: undefined });
  };

  onAddBondWithSet = () => {
    const { selected } = this.state;
    if (!selected || selected.type !== 'selection') {
      return;
    }

    this.props.onBondCreateFromSet(selected.s1, selected.s2);
  };

  onRemoveBondWithSet = () => {
    const { selected } = this.state;
    if (!selected || selected.type !== 'selection') {
      return;
    }

    this.props.onBondRemoveFromSet(selected.s1, selected.s2);
  };

  onSelectionStop = () => {
    this.setState({ selected: undefined });
    this.props.setColorForCgRepr();
  };

  onSelectionMake = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!e.currentTarget.checkValidity()) {
      toast("You must specify at least the first selection group.", "warning");
      return;
    }

    const g1 = this.state.select_1.trim();
    const g2 = this.state.select_2.trim();

    const g1_indexes = new Set<number>();
    let g2_indexes: Set<number> | undefined = undefined;

    // Get all indexes of go sites for g1
    this.repr.iterateOverGoSitesOf(g1, ap => {
      g1_indexes.add(ap.index + 1);
    }, this.selection_suffix);

    if (g2) {
      const index_to_residue: { [index: number]: number } = {};
      g2_indexes = new Set();

      // Get all indexes of sites for g2
      this.repr.iterateOverGoSitesOf(g2, ap => {
        g2_indexes!.add(ap.index + 1);
        index_to_residue[ap.index + 1] = ap.resno;
      }, this.selection_suffix);

      // Test for overlapping indexes
      const overlaps: number[] = [];
      for (const g2_index of g2_indexes) {
        if (g1_indexes.has(g2_index)) {
          overlaps.push(g2_index);
        }
      }

      // Error if overlapping indexes
      if (overlaps.length) {
        let error = "";

        if (overlaps.length > 6) {
          error = overlaps
            .slice(0, 6)
            .map(e => index_to_residue[e]).join(', ') + 
            ` (and ${overlaps.length - 6} more)`;
        }
        else if (overlaps.length > 1) {
          error = overlaps
            .slice(0, overlaps.length - 1)
            .map(e => index_to_residue[e]).join(', ') + 
            " and " + index_to_residue[overlaps[overlaps.length - 1]];
        }

        toast(`Residue${overlaps.length > 1 ? 's' : ''} ${error} overlaps in groups 1 and 2. Please make non-overlapping groups.`, "error");
        return;
      }

      // Error if empty atom list
      if (g2_indexes.size === 0) {
        toast("Group 2 does not contain any site.", "warning");
        return;
      }
    }
    
    if (g1_indexes.size === 0) {
      toast("Group 1 does not contain any site.", "warning");
      return;
    }

    // Make the coloration
    this.highlightGroup(g1_indexes, g2_indexes);
    console.log("Group 1", g1_indexes, "Group 2", g2_indexes);

    // Save the selection
    this.setState({
      mode: 'idle',
      selected: {
        type: 'selection',
        s1: g1_indexes,
        s2: g2_indexes,
      }
    });
  };

  onSideChainShowChange = (_: any, checked: boolean) => {
    this.setState(
      { show_side_chains: checked }, 
      () => this.repr.applySelection(this.selection_suffix)
    );
  };

  onGoHistoryBack = () => {
    this.props.onGoHistoryBack(1);
  };

  onHistoryChange = (_: any, checked: boolean) => {
    if (!checked) {
      this.props.goInstance.historyClear();
    }

    this.setState({
      enable_history: checked,
    });
  };

  onGoHistoryRevert = () => {
    this.props.onGoHistoryRevert(1);
  };

  renderAtomSelected() {
    if (this.state.selected?.type !== 'atom') {
      return <React.Fragment />;
    }

    return (
      <React.Fragment>
        <Typography align="center">
          Atom #<strong>{this.state.selected.source}</strong> selected.
        </Typography>

        <Marger size="1rem" />

        <Typography variant="body2" align="center">
          You can add a new bond between this atom and another Go virtual site, or
          you can remove every go bond attached to this atom.
        </Typography>
        <Typography variant="body2" align="center">
          To remove a specific bond, just click on it.
        </Typography>

        <Marger size="1rem" />

        <Box alignContent="center" justifyContent="center" width="100%" flexDirection="column">
          <Button 
            style={{ width: '100%' }} 
            color="primary" 
            onClick={this.onAddLinkEnable}
          >
            <FaIcon plus /> <span style={{ marginLeft: '.6rem' }}>Add Go bond</span>
          </Button>

          <Marger size=".2rem" />

          <Button 
            style={{ width: '100%' }} 
            color="secondary" 
            onClick={this.onRemoveAllBonds}
          >
            <FaIcon trash /> <span style={{ marginLeft: '.6rem' }}>Remove all Go links of atom</span>
          </Button>
        </Box>
      </React.Fragment>
    );
  }

  renderWaitingSecondAtomSelection() {
    if (this.state.selected?.type !== 'atom') {
      return <React.Fragment />;
    }

    return (
      <React.Fragment>
        <Typography align="center">
          Creating a link between atom #<strong>{this.state.selected!.source}</strong> and another.
        </Typography>

        <Typography variant="body2" align="center">
          Please select another Go atom to create link, or click below to cancel operation.
        </Typography>

        <Marger size="1rem" />

        <Box alignContent="center" justifyContent="center" width="100%" flexDirection="column">
          <Button 
            style={{ width: '100%' }} 
            color="primary" 
            onClick={this.onAddLinkDisable}
          >
            <FaIcon times /> <span style={{ marginLeft: '.6rem' }}>Cancel</span>
          </Button>
        </Box>
      </React.Fragment>
    );
  }

  renderLinkSelected() {
    if (this.state.selected?.type !== 'link') {
      return;
    }

    return (
      <React.Fragment>
        <Typography align="center">
          Link between atoms #<strong>{this.state.selected!.source}</strong> and #<strong>{this.state.selected!.target}</strong>.
        </Typography>

        <Typography variant="body2" align="center">
          You can remove this bond by clicking on the button below.
        </Typography>

        <Marger size="1rem" />

        <Box alignContent="center" justifyContent="center" width="100%" flexDirection="column">
          <Button 
            style={{ width: '100%' }} 
            color="secondary" 
            onClick={this.onRemoveBond}
          >
            <FaIcon trash /> <span style={{ marginLeft: '.6rem' }}>Remove</span>
          </Button>
        </Box>
      </React.Fragment>
    );
  }

  renderSelectedGroups() {
    if (this.state.selected?.type !== 'selection') {
      return <React.Fragment />;
    }

    const selection = this.state.selected;

    if (selection.s2) {
      return (
        <React.Fragment>
          <Typography variant="h6" align="center">
            First selected group
          </Typography>
          <Typography component="pre">
            <code>{this.state.select_1}</code>
          </Typography>

          <Marger size="1rem" />

          <Typography variant="h6" align="center">
            Second selected group
          </Typography>
          <Typography component="pre">
            <code>{this.state.select_2}</code>
          </Typography>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment>
        <Typography variant="h6" align="center">
          Selected group
        </Typography>
        <Typography component="pre">
          <code>{this.state.select_1}</code>
        </Typography>
      </React.Fragment>
    );
  } 

  renderSelectionMode() {
    if (this.state.selected?.type !== 'selection') {
      return <React.Fragment />;
    }
    
    const selection = this.state.selected;

    return (
      <React.Fragment>
        {this.renderSelectedGroups()}

        <Marger size="1.5rem" />

        <Typography align="center">
          <strong>
            {selection.s1.size + (selection.s2?.size ?? 0)} sites selected.
          </strong>
        </Typography>

        <Marger size="1rem" />

        <Button color="primary" onClick={this.onAddBondWithSet} style={{ width: '100%' }}>
          <FaIcon plus-circle /> 
          <span style={{ marginLeft: '.6rem' }}>Create all bonds</span>
        </Button>

        <Button color="secondary" onClick={this.onRemoveBondWithSet} style={{ width: '100%' }}>
          <FaIcon eraser /> 
          <span style={{ marginLeft: '.6rem' }}>Delete every bond</span>
        </Button>

        <Button style={{ color: 'orange', width: '100%' }} onClick={this.onSelectionStop}>
          <FaIcon arrow-left /> 
          <span style={{ marginLeft: '.6rem' }}>Back</span>
        </Button>
      </React.Fragment>
    );
  }

  renderNoneSelected() {
    return (
      <React.Fragment>
        <Typography variant="h6" align="center">
          Settings
        </Typography>

        <Box display="flex" justifyContent="center" flexDirection="column" alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={this.state.show_side_chains} 
                onChange={this.onSideChainShowChange} 
                color="secondary"
              />
            }
            label="Show side chains"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={this.state.enable_history} 
                onChange={this.onHistoryChange} 
                color="secondary"
              />
            }
            label="Enable history"
          />
        </Box>

        <Marger size="1.5rem" />

        <Typography variant="h6" align="center">
          Single atom selection
        </Typography>

        <Typography align="center">
          Please select virtual Go atom or bond by clicking on them in the molecule representation.
        </Typography>

        <Marger size=".7rem" />

        <Typography variant="body2" align="center">
          Go atoms and bonds are highlighted in green.
        </Typography>

        <Marger size="1.5rem" />
        
        <Typography variant="h6" align="center">
          Group selection
        </Typography>

        <Typography align="center">
          Select groups of go sites using the {" "}
          <strong>
            <Link href="http://nglviewer.org/ngl/api/manual/selection-language.html" target="_blank">
              NGL selection language
            </Link>
          </strong>.

          <br />

          <strong>Select one or two groups, second one is not required</strong>.
        </Typography>

        <Typography variant="body2" align="center">
          By selecting one group, you can link all the selected go sites together.
          If you select two groups, you can link every site of group 1 to every site of group 2.
        </Typography>

        <Marger size="1.5rem" />

        <form onSubmit={this.onSelectionMake} style={{ width: '100%' }}>
          <Box width="100%">
            <TextField 
              value={this.state.select_1}
              label="First group"
              onChange={e => this.setState({ select_1: e.target.value })}
              fullWidth
              required
              variant="outlined"
            />
          </Box>

          <Marger size=".5rem" />

          <Box width="100%">
            <TextField 
              value={this.state.select_2}
              label="Second group"
              onChange={e => this.setState({ select_2: e.target.value })}
              fullWidth
              variant="outlined"
            />
          </Box>

          <Marger size="1rem" />
          
          <Button style={{ width: '100%' }} type="submit" color="primary">
            <FaIcon search />
            <span style={{ marginLeft: '.7rem' }}>
              Find
            </span>
          </Button>

        </form>
      </React.Fragment>
    );
  }

  render() {
    return (
      <React.Fragment>
        <Marger size="1rem" />

        {/* Theme */}
        <Typography variant="h5" align="center">
          Edit Go virtual bonds
        </Typography>

        <Marger size="1rem" />

        {this.state.mode === 'idle' && this.state.selected?.type === 'atom' && this.renderAtomSelected()}

        {this.state.mode === 'add-link' && this.state.selected?.type === 'atom' && this.renderWaitingSecondAtomSelection()}

        {this.state.mode === 'idle' && this.state.selected?.type === 'link' && this.renderLinkSelected()}

        {this.state.mode === 'idle' && this.state.selected?.type === 'selection' && this.renderSelectionMode()}

        {this.state.mode === 'idle' && !this.state.selected && this.renderNoneSelected()}

        <Marger size="2rem" />

        <Divider style={{ width: '100%' }} />

        <Marger size="1rem" />

        <Box alignContent="center" justifyContent="center" width="100%">
          {this.state.mode === 'idle' && !this.state.selected && <React.Fragment>
            <Button 
              style={{ width: '100%' }} 
              color="primary" 
              onClick={this.props.onValidate}
            >
              <FaIcon check /> <span style={{ marginLeft: '.6rem' }}>Validate Go bonds</span>
            </Button>

            <Marger size=".5rem" />

            <Button 
              style={{ width: '100%' }} 
              color="secondary" 
              onClick={this.props.onCancel}
            >
              <FaIcon ban /> <span style={{ marginLeft: '.6rem' }}>Cancel modifications</span>
            </Button>
          </React.Fragment>}
        </Box>
        
        <Marger size=".5rem" />

        <Box display="grid" gridTemplateColumns="1fr min-content 1fr">

          <Button 
            style={{ color: this.can_go_back ? 'orange' : undefined }} 
            onClick={this.onGoHistoryBack}
            disabled={!this.can_go_back || !this.state.enable_history}
            title="Back"
          >
            <FaIcon arrow-left /> 
          </Button>

          <Button disabled style={{ color: this.state.enable_history ? 'black' : undefined }}>
            <FaIcon history /> 
          </Button>
          
          <Button 
            style={{ color: this.can_go_further ? 'green' : undefined }} 
            onClick={this.onGoHistoryRevert}
            disabled={!this.can_go_further || !this.state.enable_history}
            title="Forward"
          >
            <FaIcon arrow-right /> 
          </Button>
        </Box>
      </React.Fragment>
    );
  }
}
