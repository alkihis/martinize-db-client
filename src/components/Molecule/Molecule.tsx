import React from 'react';
import { withTheme, withStyles, Theme, Typography, Container, Divider, Link, Icon, Button } from '@material-ui/core';
import { RouteComponentProps } from 'react-router-dom';
import { Molecule } from '../../types/entities';
import { CenterComponent, BigPreloader } from '../../Shared';
import EmbeddedError from '../Errors/Errors';
import ApiHelper from '../../ApiHelper';
import qs from 'qs';
import { setPageTitle, notifyError } from '../../helpers';
import { SERVER_ROOT } from '../../constants';
import AddMolecule from '../AddMolecule/AddMolecule';
import Settings, { LoginStatus } from '../../Settings';

interface MPBP extends RouteComponentProps {
  theme: Theme;
  classes: Record<string, string>;
}

interface MPBS {
  molecule?: Molecule,
  versions: Molecule[],
  error?: number,
  edit: boolean,
}

const createStyles = (theme: Theme) => ({
  goBackLink: {
    fontSize: '1.1rem',
    "&:hover": {
      textDecoration: 'none',
    },
    marginLeft: '2vw',
  },
  nameWrapper: {
    padding: 14,
    display: 'grid',
    alignItems: 'center',
    gridTemplateColumns: '1fr 1fr 1fr',
  },
  moleculeName: {
    textAlign: 'center',
    fontSize: '1.8rem',
    fontWeight: '200',
  },
  moleculeAlias: {
    textAlign: 'right',
    fontSize: '1.1rem',
    marginRight: '2vw',
  },
});

class MoleculePageBase extends React.Component<MPBP, MPBS> {
  state: MPBS = {
    error: undefined,
    molecule: undefined,
    versions: [],
    edit: false,
  };
  
  componentDidMount() {
    // @ts-ignore
    const alias = this.props.match.params.alias;
    const query_string = qs.parse(this.props.location.search, { ignoreQueryPrefix: true });

    setPageTitle("Molecule");

    const parameters: any = { alias };
    if (query_string.version) {
      parameters.version = query_string.version;
    }

    ApiHelper.request('molecule', { parameters })  
      .then((mol: { molecule: Molecule, versions: Molecule[] }) => {
        setPageTitle(`Molecule - ${mol.molecule.alias} (${mol.molecule.version})`);
        this.setState(mol);
      })
      .catch(e => {
        // Todo print error code
        this.setState({
          error: 0
        });
      })
  }

  renderInLoad() {
    return (
      <CenterComponent style={{ minHeight: '80vh' }}>
        <BigPreloader />
      </CenterComponent>
    );
  }

  renderError() {
    // todo better error
    return (
      <EmbeddedError title="Unable to find molecule." text="Check the URL." />
    );
  }

  goBackButton() {
    return (
      <Link href="#" onClick={() => this.props.history.goBack()} className={this.props.classes.goBackLink}>
        <Icon className="fas fa-arrow-left" style={{ marginRight: 10, fontSize: '1.1rem' }} />
        Go back 
      </Link>
    )
  }

  delete = () => {
    // todo make delete modal
    ApiHelper.request('molecule/destroy/' + this.state.molecule!.id, { method: 'DELETE' })
      .then(() => {
        window.location.pathname = "/explore";
      })
      .catch(notifyError);
  };

  render() {
    if (this.state.error !== undefined) {
      return this.renderError();
    }

    if (!this.state.molecule) {
      return this.renderInLoad();
    }

    const molecule = this.state.molecule;
    const classes = this.props.classes;
    let is_same_as_logged = false;
    if (Settings.user) {
      is_same_as_logged = Settings.user.id === molecule.owner;
    }
    
    return (
      <React.Fragment>
        <div className={classes.nameWrapper}>
          {/* we came from another page of the website */}
          {(this.props.history.action === "PUSH") ? this.goBackButton() : <span />}

          <span className={classes.moleculeName}>
            {molecule.name}
          </span>

          <span className={classes.moleculeAlias}>
            {molecule.alias}
          </span>
        </div>

        <Divider />

        <Container>
          <pre className="pre-break">
            <code>
              {`#${molecule.id}

              Last update at ${molecule.last_update}

              Creation date at ${molecule.created_at}

              Related ZIP file ID: ${molecule.files}

              Molecule version ${molecule.version} built on Martinize ${molecule.martinize_version} with force field ${molecule.force_field}.\n`}
            </code>

            <br />

            <Link href={SERVER_ROOT + "api/molecule/download?id=" + molecule.files + "&filename=" + molecule.alias + ".zip"} style={{ fontSize: '1.2rem' }}>
              <Icon className="fas fa-download" style={{ fontSize: '1.2rem', marginRight: 10 }} />
              <span>
                Download related files
              </span>
            </Link>
          </pre>

          {/* Edit / delete button */}
          <div style={{ display: 'flex', marginTop: 15 }}>
            {Settings.logged === LoginStatus.Admin && <Button variant="outlined" color="primary" style={{ marginRight: 10 }} onClick={() => this.setState({ edit: true })}>
              Edit
            </Button>}
            {(Settings.logged === LoginStatus.Admin || is_same_as_logged) &&  <Button variant="outlined" color="secondary" onClick={this.delete}>
              Delete
            </Button>}
          </div>

          <Divider />
          
          <pre>
            {this.state.versions.length} versions available.
          </pre>

          <pre>
            <code>
              {JSON.stringify(this.state.versions, null, 2)}
            </code>
          </pre>
        </Container>

        <AddMolecule
          onChange={mol => this.setState({ molecule: mol as Molecule, edit: false })}
          from={this.state.molecule}
          open={this.state.edit}
          onClose={() => this.setState({ edit: false })}
        />
      </React.Fragment>
    );
  }
}

// @ts-ignore
export default withTheme(withStyles(createStyles)(MoleculePageBase));
