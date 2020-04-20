import React from 'react';
import { withStyles, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, DialogContentText, CircularProgress } from '@material-ui/core';
import AddMoleculeFileInput from '../../AddMolecule/AddMoleculeFileInput';
import StashedBuild from '../StashedBuild';
import StashedBuildHelper from '../../../StashedBuildHelper';
import { toast } from '../../Toaster';
import { Marger, FaIcon } from '../../../helpers';
import ApiHelper from '../../../ApiHelper';
import { Molecule } from '../../../types/entities';

export interface MoleculeWithFiles {
  pdb: File;
  top: File;
  itps: File[];
}

interface MCProps {
  classes: Record<string, string>;
  onMoleculeChoose(molecule: MoleculeWithFiles | string): any;
}

interface MCState {
  pdb?: File;
  top?: File;
  itps: File[];
  modal_chooser: boolean;
}

class MoleculeChooser extends React.Component<MCProps, MCState> {
  state: MCState = {
    itps: [],
    modal_chooser: false,
  };

  nextFromFiles = () => {
    const { pdb, top, itps } = this.state;

    if (pdb && top && itps.length) {
      this.props.onMoleculeChoose({
        pdb, top, itps
      });
    }
    else {
      toast("Some required files are missing.", "error");
    }
  };

  nextFromId = (id: string) => {
    this.setState({ modal_chooser: false });
    this.props.onMoleculeChoose(id);
  };

  get can_continue() {
    const { pdb, top, itps } = this.state;

    return !!(pdb && top && itps.length);
  }

  render() {
    return (
      <React.Fragment>
        <ModalMoleculeSelector
          open={this.state.modal_chooser}
          onChoose={this.nextFromId}
          onCancel={() => this.setState({ modal_chooser: false })}
        />

        <Marger size="1rem" />

        <Typography align="center" variant="h6">
          Load from database
        </Typography>

        <Marger size="1rem" />

        <div style={{ textAlign: 'center' }}>
          <Button variant="outlined" color="primary" onClick={() => this.setState({ modal_chooser: true })}>
            Search a molecule
          </Button>
        </div>

        <Marger size="2rem" />

        <Typography align="center" variant="h6">
          Load from saved molecules
        </Typography>
        
        <StashedBuild 
          onSelect={async uuid => {
            const helper = new StashedBuildHelper();
            const save = await helper.get(uuid);

            if (save) {
              this.setState({
                pdb: new File([save.coarse_grained.content], save.coarse_grained.name),
                top: new File([save.top_file.content], save.top_file.name),
                itps: save.itp_files.map(e => new File([e.content], e.name)),
              }, this.nextFromFiles);
            }
          }}
        />

        <Marger size="1rem" />

        <Typography align="center" variant="h6">
          Upload a molecule
        </Typography>
        
        <Marger size="1rem" />

        <AddMoleculeFileInput 
          onChange={({ itp, top, pdb }) => {
            this.setState({
              pdb,
              top,
              itps: itp,
            });
          }}
        />

        <Marger size="1rem" />

        <div style={{ textAlign: 'right' }}>
          <Button variant="outlined" color="primary" disabled={!this.can_continue} onClick={this.nextFromFiles}>
            Next
          </Button>
        </div>
      </React.Fragment>
    );
  }
}

export default withStyles(theme => ({

}))(MoleculeChooser);

interface ModalState {
  search: string;
  loading: boolean;
  molecules: Molecule[];
  load_more: boolean;
  content: string;
}

class ModalMoleculeSelector extends React.Component<{ open: boolean; onChoose(id: string): any; onCancel(): any; }, ModalState> {
  timeout: NodeJS.Timeout | undefined;

  state: ModalState = {
    search: "",
    loading: false,
    molecules: [],
    load_more: false,
    content: "",
  };

  onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    this.setState({ search: e.target.value });

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }

    const content = e.target.value.trim();
    if (content) {
      this.timeout = setTimeout(() => {
        this.timeout = undefined;
        this.startSearch(content);
      }, 350);
    }
    else {
      this.setState({
        content: '',
        molecules: [],
        load_more: false,
        loading: false,
      });
    }
  };

  onLoadMore = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    this.enlargeSearch();
  };

  async startSearch(content: string) {
    this.setState({ loading: true, load_more: false, content: "", molecules: [], });

    try { 
      const { molecules, length }: { molecules: Molecule[], length: number } = await ApiHelper.request('molecule/list', { 
        parameters: { q: content, combine: 'false', limit: 10 } 
      });

      if (this.state.loading)
        this.setState({ molecules, load_more: molecules.length < length, content });
    } catch (e) {
      toast("Error while loading molecules.", "error");
    } finally {
      this.setState({ loading: false });
    }
  }

  async enlargeSearch() {
    const content = this.state.content;

    this.setState({ loading: true, load_more: false, });

    try { 
      const { molecules, length }: { molecules: Molecule[], length: number } = await ApiHelper.request('molecule/list', { 
        parameters: { q: content, combine: 'false', limit: 10, skip: this.state.molecules.length, } 
      });

      const new_molecules = [...this.state.molecules, ...molecules];

      this.setState({ 
        molecules: new_molecules, 
        load_more: new_molecules.length < length, 
      });
    } catch (e) {
      toast("Error while loading molecules.", "error");
    } finally {
      this.setState({ loading: false });
    }
  }

  openUrl(molecule: Molecule) {
    window.open('/molecule/' + molecule.alias + '?version=' + molecule.id, '_blank');
  }

  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onCancel} maxWidth="md" fullWidth>
        <DialogTitle>
          Find a molecule
        </DialogTitle>

        <DialogContent>
          <div>
            <TextField
              value={this.state.search}
              onChange={this.onInputChange}
              placeholder="Enter a query..."
              style={{ width: '100%' }}
              variant="outlined"
            />
          </div>

          <Marger size="1rem" />

          {this.state.molecules.length > 0 && <List>
            {this.state.molecules.map(m => (
              <ListItem button onClick={() => this.props.onChoose(m.id)}>
                <ListItemText
                  primary={`${m.name} (${m.alias}) - ${m.force_field} - Version ${m.version}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => this.openUrl(m)}>
                    <FaIcon external-link-alt />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>)
            )}
          </List>}

          {this.state.load_more && <div>
            <DialogContentText align="center" color="primary" style={{ cursor: 'pointer' }} onClick={this.onLoadMore}>
              Load more
            </DialogContentText>
          </div>}

          {this.state.loading && <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', }}>
            <CircularProgress size={48} />
          </div>}

          {this.state.molecules.length === 0 && this.state.content && !this.state.loading && <div>
            <DialogContentText align="center">
              No molecule matches your search.
            </DialogContentText>  
          </div>}
        </DialogContent>
        
        <DialogActions>
          <Button color="secondary" onClick={this.props.onCancel}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}